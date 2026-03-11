from flask_cors import CORS
from pdf2docx import Converter
import mammoth
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.platypus import ListItem, ListFlowable
from html.parser import HTMLParser

app = Flask(__name__)

# Production-ready CORS
allowed_origin = os.environ.get('ALLOWED_ORIGIN', 'http://localhost:5173')
CORS(app, resources={r"/*": {"origins": allowed_origin}})

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_PDF = {'pdf'}
ALLOWED_WORD = {'docx', 'doc'}


def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def _cleanup(*paths):
    for p in paths:
        try:
            if p and os.path.exists(p):
                os.remove(p)
        except OSError:
            pass


class HTMLToPDFConverter(HTMLParser):
    """Converts mammoth HTML output into ReportLab flowables."""

    def __init__(self, styles):
        super().__init__()
        self.styles = styles
        self.flowables = []
        self._current_tag = None
        self._current_text = []
        self._in_list = False
        self._list_items = []
        self._ordered = False

        self.heading_map = {
            'h1': ('Heading1', 16),
            'h2': ('Heading2', 14),
            'h3': ('Heading3', 12),
            'h4': ('Heading4', 11),
        }

    def handle_starttag(self, tag, attrs):
        self._current_tag = tag
        if tag in ('ul', 'ol'):
            self._in_list = True
            self._ordered = (tag == 'ol')
        if tag == 'li':
            self._current_text = []

    def handle_endtag(self, tag):
        text = ''.join(self._current_text).strip()

        if tag in self.heading_map:
            if text:
                style_name, _ = self.heading_map[tag]
                try:
                    style = self.styles[style_name]
                except KeyError:
                    style = self.styles['Normal']
                self.flowables.append(Spacer(1, 0.1 * inch))
                self.flowables.append(Paragraph(text, style))
                self.flowables.append(Spacer(1, 0.05 * inch))
            self._current_text = []

        elif tag == 'p':
            if text:
                self.flowables.append(Paragraph(text, self.styles['Normal']))
                self.flowables.append(Spacer(1, 0.05 * inch))
            self._current_text = []

        elif tag == 'li':
            if text:
                self._list_items.append(ListItem(Paragraph(text, self.styles['Normal']), leftIndent=20))
            self._current_text = []

        elif tag in ('ul', 'ol'):
            if self._list_items:
                bullet_type = '1' if self._ordered else 'bullet'
                self.flowables.append(
                    ListFlowable(self._list_items, bulletType=bullet_type, leftIndent=20)
                )
                self.flowables.append(Spacer(1, 0.05 * inch))
            self._list_items = []
            self._in_list = False

        elif tag == 'hr':
            self.flowables.append(HRFlowable(width='100%', thickness=1, color=colors.grey))
            self.flowables.append(Spacer(1, 0.05 * inch))

        self._current_tag = None

    def handle_data(self, data):
        if self._current_tag in ('strong', 'b'):
            self._current_text.append(f'<b>{data}</b>')
        elif self._current_tag in ('em', 'i'):
            self._current_text.append(f'<i>{data}</i>')
        elif self._current_tag == 'u':
            self._current_text.append(f'<u>{data}</u>')
        elif self._current_tag in ('code', 'pre'):
            self._current_text.append(f'<font name="Courier">{data}</font>')
        else:
            self._current_text.append(data)


def html_to_pdf_flowables(html_content):
    """Parse HTML from mammoth and return ReportLab flowables."""
    styles = getSampleStyleSheet()
    # Increase base font size slightly
    styles['Normal'].fontSize = 11
    styles['Normal'].leading = 16

    parser = HTMLToPDFConverter(styles)
    # Clean up any stray newlines between tags so the parser handles inline tags correctly
    html_content = re.sub(r'\s*\n\s*', ' ', html_content)
    parser.feed(html_content)
    return parser.flowables


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/convert', methods=['POST'])
def convert():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    mode = request.form.get('mode', 'pdf_to_word')

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    unique_id = str(uuid.uuid4())

    # ── PDF → Word ──────────────────────────────────────────────────────────
    if mode == 'pdf_to_word':
        if not allowed_file(file.filename, ALLOWED_PDF):
            return jsonify({'error': 'Please upload a PDF file for PDF → Word conversion'}), 400

        input_path = os.path.join(UPLOAD_FOLDER, f'{unique_id}_input.pdf')
        output_path = os.path.join(UPLOAD_FOLDER, f'{unique_id}_output.docx')

        file.save(input_path)
        try:
            cv = Converter(input_path)
            cv.convert(output_path, start=0, end=None)
            cv.close()
        except Exception as e:
            _cleanup(input_path)
            return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

        _cleanup(input_path)
        original_name = os.path.splitext(file.filename)[0]
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f'{original_name}.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    # ── Word → PDF ──────────────────────────────────────────────────────────
    elif mode == 'word_to_pdf':
        if not allowed_file(file.filename, ALLOWED_WORD):
            return jsonify({'error': 'Please upload a .docx or .doc file for Word → PDF conversion'}), 400

        ext = file.filename.rsplit('.', 1)[1].lower()
        input_path = os.path.join(UPLOAD_FOLDER, f'{unique_id}_input.{ext}')
        output_path = os.path.join(UPLOAD_FOLDER, f'{unique_id}_output.pdf')

        file.save(input_path)
        try:
            # Step 1: DOCX → HTML via mammoth
            with open(input_path, 'rb') as docx_file:
                result = mammoth.convert_to_html(docx_file)
                html_content = result.value

            # Step 2: HTML → ReportLab flowables
            flowables = html_to_pdf_flowables(html_content)

            if not flowables:
                # Fallback: put any plain text content
                flowables = [Paragraph("(Empty document)", getSampleStyleSheet()['Normal'])]

            # Step 3: Render PDF
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=inch,
                leftMargin=inch,
                topMargin=inch,
                bottomMargin=inch,
            )
            doc.build(flowables)

        except Exception as e:
            _cleanup(input_path)
            return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

        _cleanup(input_path)
        original_name = os.path.splitext(file.filename)[0]
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f'{original_name}.pdf',
            mimetype='application/pdf'
        )

    else:
        return jsonify({'error': 'Invalid mode. Use "pdf_to_word" or "word_to_pdf"'}), 400


if __name__ == '__main__':
    # Use environment variables for port and debug mode
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
