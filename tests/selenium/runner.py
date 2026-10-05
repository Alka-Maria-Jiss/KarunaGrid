import os
import sys
import time
import unittest
from pathlib import Path
from datetime import datetime

# Set up paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'karunagrid.settings')
import django
django.setup()

# Import ReportLab for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


class DetailedTestResult(unittest.TestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_records = []
        self.start_times = {}

    def startTest(self, test):
        super().startTest(test)
        self.start_times[test.id()] = time.time()

    def addSuccess(self, test):
        super().addSuccess(test)
        elapsed = time.time() - self.start_times.get(test.id(), time.time())
        self.test_records.append({
            'id': test.id(),
            'name': test._testMethodName,
            'class': test.__class__.__name__,
            'module': test.__class__.__module__.split('.')[-1],
            'doc': test.shortDescription() or test._testMethodName.replace('_', ' ').capitalize(),
            'status': 'PASSED',
            'elapsed': elapsed,
            'error': None
        })
        print(f"  [PASS] {test._testMethodName} ({elapsed:.2f}s)")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        elapsed = time.time() - self.start_times.get(test.id(), time.time())
        self.test_records.append({
            'id': test.id(),
            'name': test._testMethodName,
            'class': test.__class__.__name__,
            'module': test.__class__.__module__.split('.')[-1],
            'doc': test.shortDescription() or test._testMethodName.replace('_', ' ').capitalize(),
            'status': 'FAILED',
            'elapsed': elapsed,
            'error': self._exc_info_to_string(err, test)
        })
        print(f"  [FAIL] {test._testMethodName} ({elapsed:.2f}s)")

    def addError(self, test, err):
        super().addError(test, err)
        elapsed = time.time() - self.start_times.get(test.id(), time.time())
        self.test_records.append({
            'id': test.id(),
            'name': test._testMethodName,
            'class': test.__class__.__name__,
            'module': test.__class__.__module__.split('.')[-1],
            'doc': test.shortDescription() or test._testMethodName.replace('_', ' ').capitalize(),
            'status': 'ERROR',
            'elapsed': elapsed,
            'error': self._exc_info_to_string(err, test)
        })
        print(f"  [ERROR] {test._testMethodName} ({elapsed:.2f}s)")

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.test_records.append({
            'id': test.id(),
            'name': test._testMethodName,
            'class': test.__class__.__name__,
            'module': test.__class__.__module__.split('.')[-1],
            'doc': test.shortDescription() or test._testMethodName.replace('_', ' ').capitalize(),
            'status': 'SKIPPED',
            'elapsed': 0.0,
            'error': reason
        })
        print(f"  [SKIP] {test._testMethodName} - {reason}")


def generate_markdown_report(result, total_time, output_path):
    """Generate comprehensive SELENIUM_TEST_REPORT.md"""
    total_tests = len(result.test_records)
    passed_tests = sum(1 for r in result.test_records if r['status'] == 'PASSED')
    failed_tests = sum(1 for r in result.test_records if r['status'] in ('FAILED', 'ERROR'))
    skipped_tests = sum(1 for r in result.test_records if r['status'] == 'SKIPPED')

    # Group by module
    modules = {}
    for r in result.test_records:
        mod = r['module']
        if mod not in modules:
            modules[mod] = []
        modules[mod].append(r)

    md = []
    md.append("# KarunaGrid Selenium Automated E2E Test Report")
    md.append("")
    md.append(f"**Execution Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    md.append(f"**Total Execution Time:** {total_time:.2f} seconds")
    md.append(f"**Target Frontend:** `{os.environ.get('SELENIUM_FRONTEND_URL', 'http://localhost:5173')}`")
    md.append(f"**Target Backend API:** `{os.environ.get('SELENIUM_BACKEND_URL', 'http://127.0.0.1:8000')}`")
    md.append(f"**Browser Engine:** Google Chrome Headless (Selenium 4.50)")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 1. Executive Summary")
    md.append("")
    md.append("| Metric | Count | Percentage |")
    md.append("| :--- | :--- | :--- |")
    md.append(f"| **Total Tests** | {total_tests} | 100% |")
    md.append(f"| **Passed** | {passed_tests} | {(passed_tests/total_tests*100) if total_tests else 0:.1f}% |")
    md.append(f"| **Failed / Errors** | {failed_tests} | {(failed_tests/total_tests*100) if total_tests else 0:.1f}% |")
    md.append(f"| **Skipped** | {skipped_tests} | {(skipped_tests/total_tests*100) if total_tests else 0:.1f}% |")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 2. Test Area Breakdown")
    md.append("")
    md.append("| Test Area | Module | Tests | Passed | Failed | Status |")
    md.append("| :--- | :--- | :---: | :---: | :---: | :--- |")

    area_names = {
        'test_authentication': 'Authentication & Account Lifecycle',
        'test_admin': 'Administrator Portal & Approvals',
        'test_doctor': 'Doctor Portal & Clinical Oversight',
        'test_nurse': 'Nurse Portal & Care Coordination',
        'test_caregiver': 'Caregiver Portal & Patient Support',
        'test_patient': 'Patient Portal & Medical Services',
        'test_home_visits': 'Shared Nurse Team Home Visits',
        'test_telemedicine': 'Telemedicine Consultations',
        'test_equipment': 'Medical Equipment Lifecycle',
        'test_welfare': 'Welfare Schemes & External Links',
        'test_notifications': 'Real-time Notifications',
        'test_profiles': 'User Profiles & Settings',
        'test_security_authorization': 'Role-Based Access Control (RBAC)',
    }

    for mod, tests in modules.items():
        area_title = area_names.get(mod, mod.replace('test_', '').title())
        m_total = len(tests)
        m_passed = sum(1 for t in tests if t['status'] == 'PASSED')
        m_failed = sum(1 for t in tests if t['status'] in ('FAILED', 'ERROR'))
        status_badge = "PASS" if m_failed == 0 else "FAIL"
        md.append(f"| {area_title} | `{mod}` | {m_total} | {m_passed} | {m_failed} | **{status_badge}** |")

    md.append("")
    md.append("---")
    md.append("")
    md.append("## 3. Detailed Test Results")
    md.append("")

    for mod, tests in modules.items():
        area_title = area_names.get(mod, mod.replace('test_', '').title())
        md.append(f"### {area_title}")
        md.append("")
        md.append("| Test Method | Description | Duration | Status |")
        md.append("| :--- | :--- | :---: | :--- |")
        for t in tests:
            st = f"**{t['status']}**" if t['status'] == 'PASSED' else f"**`{t['status']}`**"
            md.append(f"| `{t['name']}` | {t['doc']} | {t['elapsed']:.2f}s | {st} |")
        md.append("")

    if failed_tests > 0:
        md.append("---")
        md.append("")
        md.append("## 4. Failure Investigation & Debug Logs")
        md.append("")
        for t in result.test_records:
            if t['status'] in ('FAILED', 'ERROR'):
                md.append(f"### `{t['name']}` ({t['class']})")
                md.append("```text")
                md.append(t['error'] or "No error traceback recorded.")
                md.append("```")
                md.append("")

    output_path.write_text("\n".join(md), encoding='utf-8')
    print(f"\n[Generated Markdown Report: {output_path}]")


def generate_pdf_report(result, total_time, pdf_path):
    """Generate polished PDF report using ReportLab"""
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1e1b14'),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#645e45'),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1e1b14'),
        spaceBefore=12,
        spaceAfter=8
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e1b14')
    )

    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e1b14')
    )

    cell_pass = ParagraphStyle(
        'TableCellPass',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#15803d')
    )

    cell_fail = ParagraphStyle(
        'TableCellFail',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#b91c1c')
    )

    story = []

    # Title & Header
    story.append(Paragraph("KarunaGrid E2E Selenium Test Suite Report", title_style))
    story.append(Paragraph(
        f"Execution Timestamp: <b>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</b> | "
        f"Duration: <b>{total_time:.2f}s</b> | Browser: <b>Google Chrome Headless</b>",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#645e45'), spaceAfter=14))

    # Summary Metrics Table
    total_tests = len(result.test_records)
    passed_tests = sum(1 for r in result.test_records if r['status'] == 'PASSED')
    failed_tests = sum(1 for r in result.test_records if r['status'] in ('FAILED', 'ERROR'))
    skipped_tests = sum(1 for r in result.test_records if r['status'] == 'SKIPPED')

    summary_data = [
        [Paragraph("Total Test Cases", cell_bold), Paragraph(str(total_tests), cell_style), Paragraph("100%", cell_style)],
        [Paragraph("Passed Test Cases", cell_bold), Paragraph(str(passed_tests), cell_pass), Paragraph(f"{(passed_tests/total_tests*100) if total_tests else 0:.1f}%", cell_pass)],
        [Paragraph("Failed / Errored Test Cases", cell_bold), Paragraph(str(failed_tests), cell_fail if failed_tests > 0 else cell_style), Paragraph(f"{(failed_tests/total_tests*100) if total_tests else 0:.1f}%", cell_fail if failed_tests > 0 else cell_style)],
        [Paragraph("Skipped Test Cases", cell_bold), Paragraph(str(skipped_tests), cell_style), Paragraph(f"{(skipped_tests/total_tests*100) if total_tests else 0:.1f}%", cell_style)],
    ]

    t_summary = Table(
        [[Paragraph("Metric", cell_bold), Paragraph("Count", cell_bold), Paragraph("Percentage", cell_bold)]] + summary_data,
        colWidths=[200, 150, 150]
    )
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7f5ee')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e9e2d5')),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))

    story.append(Paragraph("1. Executive Summary", h2_style))
    story.append(t_summary)
    story.append(Spacer(1, 14))

    # Modules Breakdown Table
    story.append(Paragraph("2. Test Modules Breakdown", h2_style))

    modules = {}
    for r in result.test_records:
        mod = r['module']
        if mod not in modules:
            modules[mod] = []
        modules[mod].append(r)

    area_names = {
        'test_authentication': 'Authentication & Account Lifecycle',
        'test_admin': 'Administrator Portal & Approvals',
        'test_doctor': 'Doctor Portal & Clinical Oversight',
        'test_nurse': 'Nurse Portal & Care Coordination',
        'test_caregiver': 'Caregiver Portal & Patient Support',
        'test_patient': 'Patient Portal & Medical Services',
        'test_home_visits': 'Shared Nurse Team Home Visits',
        'test_telemedicine': 'Telemedicine Consultations',
        'test_equipment': 'Medical Equipment Lifecycle',
        'test_welfare': 'Welfare Schemes & External Links',
        'test_notifications': 'Real-time Notifications',
        'test_profiles': 'User Profiles & Settings',
        'test_security_authorization': 'Role-Based Access Control (RBAC)',
    }

    mod_data = [[
        Paragraph("Test Module", cell_bold),
        Paragraph("Tests", cell_bold),
        Paragraph("Passed", cell_bold),
        Paragraph("Failed", cell_bold),
        Paragraph("Status", cell_bold)
    ]]

    for mod, tests in modules.items():
        area_title = area_names.get(mod, mod.replace('test_', '').title())
        m_total = len(tests)
        m_passed = sum(1 for t in tests if t['status'] == 'PASSED')
        m_failed = sum(1 for t in tests if t['status'] in ('FAILED', 'ERROR'))
        status_p = Paragraph("PASS", cell_pass) if m_failed == 0 else Paragraph("FAIL", cell_fail)

        mod_data.append([
            Paragraph(f"<b>{area_title}</b>", cell_style),
            Paragraph(str(m_total), cell_style),
            Paragraph(str(m_passed), cell_pass if m_passed > 0 else cell_style),
            Paragraph(str(m_failed), cell_fail if m_failed > 0 else cell_style),
            status_p
        ])

    t_mod = Table(mod_data, colWidths=[200, 70, 75, 75, 80])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7f5ee')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e9e2d5')),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(t_mod)
    story.append(Spacer(1, 14))

    # Detailed Individual Test Results
    story.append(Paragraph("3. Detailed Test Execution Log", h2_style))

    detail_data = [[
        Paragraph("Test Name", cell_bold),
        Paragraph("Module", cell_bold),
        Paragraph("Time", cell_bold),
        Paragraph("Result", cell_bold)
    ]]

    for t in result.test_records:
        res_p = Paragraph(t['status'], cell_pass if t['status'] == 'PASSED' else cell_fail)
        detail_data.append([
            Paragraph(f"<b>{t['name']}</b><br/><font size=7 color='#645e45'>{t['doc']}</font>", cell_style),
            Paragraph(t['module'].replace('test_', ''), cell_style),
            Paragraph(f"{t['elapsed']:.2f}s", cell_style),
            res_p
        ])

    t_detail = Table(detail_data, colWidths=[240, 120, 65, 75])
    t_detail.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7f5ee')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e9e2d5')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(t_detail)

    doc.build(story)
    print(f"[Generated PDF Report: {pdf_path}]")


def main():
    print("=" * 70)
    print("STARTING KARUNAGRID SELENIUM E2E TEST SUITE")
    print("=" * 70)

    start_time = time.time()
    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir=str(Path(__file__).resolve().parent),
        pattern='test_*.py'
    )

    runner = unittest.TextTestRunner(resultclass=DetailedTestResult, verbosity=0)
    result = runner.run(suite)
    total_time = time.time() - start_time

    # Generate Reports
    md_path = PROJECT_ROOT / 'SELENIUM_TEST_REPORT.md'
    pdf_path = PROJECT_ROOT / 'SELENIUM_TEST_REPORT.pdf'

    generate_markdown_report(result, total_time, md_path)
    try:
        generate_pdf_report(result, total_time, pdf_path)
    except Exception as e:
        print(f"Error creating PDF report: {e}")

    print("=" * 70)
    print(f"FINISHED IN {total_time:.2f}s | PASSED: {len(result.test_records) - len(result.failures) - len(result.errors)}/{len(result.test_records)}")
    print("=" * 70)

    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main())
