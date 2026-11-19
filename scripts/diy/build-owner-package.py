"""Build an explicitly preview-only owner packet, never a repository/source dump."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile
import re
from html import escape

ROOT = Path(__file__).resolve().parents[2]
PRODUCT = ROOT / 'products/revenue-rescue-diy'
OUT = ROOT.parent / 'artifacts/revenue-rescue-diy-v0.1.0'
FILES = ['START-HERE.html', 'OWNER-GUIDE.md', 'EXAMPLES-AND-REVIEW.md', 'PRIVACY-COSTS-SUPPORT.md']


def build():
    readiness = json.loads((PRODUCT / 'CONNECTOR-READINESS.json').read_text())
    assert readiness['customerReleaseApproved'] is False
    assert readiness['checkoutEnabled'] is False
    assert all(not c['canChargeForReadyToUseConnector'] for c in readiness['connectors'])
    OUT.mkdir(parents=True, exist_ok=True)
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    font_dir = Path('/usr/share/fonts/truetype/dejavu')
    pdfmetrics.registerFont(TTFont('OwnerSans', str(font_dir / 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont('OwnerSansBold', str(font_dir / 'DejaVuSans-Bold.ttf')))
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = 'OwnerSansBold' if style.name.startswith(('Heading', 'Title')) else 'OwnerSans'
    for name in ['Normal', 'BodyText']:
        styles[name].fontName = 'OwnerSans'
        styles[name].fontSize = 10.5
        styles[name].leading = 16
        styles[name].spaceAfter = 9
    styles['Title'].textColor = colors.HexColor('#183342')
    styles['Title'].alignment = TA_LEFT
    story = [Paragraph('AI &amp; MAIN', styles['Heading2']), Paragraph('Revenue Rescue', styles['Title']),
             Paragraph('DIY Operations Kit | Owner preview v0.1.0', styles['Heading2']),
             Paragraph('For HubSpot, Jobber and GoHighLevel owners. Customer connectors and paid availability remain pending. This is a review package, not an installed agent.', styles['BodyText']),
             Spacer(1, 18), PageBreak()]
    for name in FILES[1:]:
        if name != FILES[1]:
            story.append(PageBreak())
        paragraph = []
        def flush():
            if paragraph:
                story.append(Paragraph(escape(' '.join(paragraph)), styles['BodyText']))
                paragraph.clear()
        for line in (PRODUCT / 'owner' / name).read_text().splitlines():
            if line.startswith('#'):
                flush()
                level = len(line) - len(line.lstrip('#'))
                story.append(Paragraph(escape(line.lstrip('#').strip()), styles['Heading1' if level == 1 else 'Heading2']))
            elif not line.strip():
                flush()
            elif line.startswith('- '):
                flush()
                story.append(Paragraph(escape(line[2:]), styles['BodyText'], bulletText='-'))
            elif re.match(r'^\d+\. ', line):
                flush()
                paragraph.append(line.strip())
            else:
                paragraph.append(line.strip())
        flush()
    pdf = OUT / 'Revenue-Rescue-Owner-Preview.pdf'
    def footer(canvas, doc):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#536a73'))
        canvas.drawString(42, 26, 'AI & MAIN | PREVIEW - not a released customer connector')
        canvas.drawRightString(letter[0] - 42, 26, str(doc.page))
    SimpleDocTemplate(str(pdf), pagesize=letter, rightMargin=42, leftMargin=42, topMargin=42, bottomMargin=45,
                      title='Revenue Rescue - Owner Preview', author='AI & MAIN').build(story, onFirstPage=footer, onLaterPages=footer)
    payloads = {name: (PRODUCT / 'owner' / name).read_bytes() for name in FILES}
    payloads[pdf.name] = pdf.read_bytes()
    payloads['PREVIEW-STATUS.txt'] = b'AI & MAIN review preview only. No customer connector release, commercial license, setup, deployment, payment, semantic approval or execution approval is granted by this download. Final sale/license/support/refund terms remain pending.\n'
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    manifest = {'contractVersion': 'revenue-rescue-owner-package-v1', 'packageVersion': '0.1.0-owner-preview',
                'sourceCheckpoint': commit, 'status': 'PREVIEW_NOT_CUSTOMER_RELEASED', 'checkoutEnabled': False,
                'contents': [{'name': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)} for name, data in payloads.items()]}
    payloads['manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    archive = OUT / 'Revenue-Rescue-DIY-Owner-Preview-v0.1.0.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(payloads.items()):
            item = zipfile.ZipInfo(name, date_time=(2026, 11, 19, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(item, data)
    for name in FILES:
        (OUT / name).write_bytes(payloads[name])
    (OUT / 'manifest.json').write_bytes(payloads['manifest.json'])
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (OUT / 'SHA256SUMS.txt').write_text(digest + '  ' + archive.name + '\n')
    with zipfile.ZipFile(archive) as z:
        assert set(z.namelist()) == set(payloads)
        for item in manifest['contents']:
            assert hashlib.sha256(z.read(item['name'])).hexdigest() == item['sha256']
    print(json.dumps({'built': True, 'archive': str(archive), 'pdf': str(pdf), 'sha256': digest,
                      'files': len(payloads), 'customerReleaseApproved': False, 'remoteCalls': 0}))


if __name__ == '__main__':
    build()
