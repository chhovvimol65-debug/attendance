import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { EmployeePayrollItem, Language } from '../types';

export interface PdfExportProgress {
  current: number;
  total: number;
  employeeName: string;
}

/**
 * Formatted HTML string builder for an official A4 employee payslip
 */
export function createPayslipHtml(
  item: EmployeePayrollItem,
  month: number,
  year: number,
  language: Language
): string {
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesKm = [
    'មករា (January)', 'កុម្ភៈ (February)', 'មីនា (March)', 'មេសា (April)',
    'ឧសភា (May)', 'មិថុនា (June)', 'កក្កដា (July)', 'សីហា (August)',
    'កញ្ញា (September)', 'តុលា (October)', 'វិច្ឆិកា (November)', 'ធ្នូ (December)'
  ];

  const monthLabel = language === 'km' ? monthNamesKm[month - 1] : monthNamesEn[month - 1];
  const issueDate = new Date().toISOString().split('T')[0];
  const voucherRef = `PAY-${year}${String(month).padStart(2, '0')}-${item.employeeId}`;

  // Build late scan logs rows
  let lateLogsHtml = '';
  if (item.lateScanLogs && item.lateScanLogs.length > 0) {
    lateLogsHtml = `
      <div style="margin-top: 14px; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; background: #fffbeb;">
        <div style="background: #fef3c7; padding: 6px 12px; font-weight: 700; font-size: 10px; color: #92400e; border-bottom: 1px solid #fed7aa; display: flex; justify-content: space-between;">
          <span>${language === 'km' ? 'កំណត់ត្រាស្កេនចូលយឺតជាក់ស្តែង (Late Check-in Log)' : 'Itemized Late Check-In Scan Audit Log'}</span>
          <span>${item.lateScanLogs.length} ${language === 'km' ? 'លើក' : 'events'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: left;">
          <thead>
            <tr style="background: #fff7ed; color: #78350f; border-bottom: 1px solid #fed7aa;">
              <th style="padding: 5px 10px;">${language === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
              <th style="padding: 5px 10px;">${language === 'km' ? 'ម៉ោងកំណត់' : 'Scheduled'}</th>
              <th style="padding: 5px 10px;">${language === 'km' ? 'ម៉ោងស្កេន' : 'Scan Time'}</th>
              <th style="padding: 5px 10px;">${language === 'km' ? 'យឺត (នាទី)' : 'Minutes Late'}</th>
              <th style="padding: 5px 10px; text-align: right;">${language === 'km' ? 'កាត់ប្រាក់' : 'Penalty'}</th>
            </tr>
          </thead>
          <tbody>
            ${item.lateScanLogs.map(l => `
              <tr style="border-bottom: 1px solid #fef3c7; font-family: monospace;">
                <td style="padding: 4px 10px; font-weight: 600; color: #1e293b; font-family: inherit;">${l.date}</td>
                <td style="padding: 4px 10px; color: #64748b;">${l.scheduledTime}</td>
                <td style="padding: 4px 10px; color: #b45309; font-weight: bold;">${l.scanTime}</td>
                <td style="padding: 4px 10px; color: #e11d48; font-weight: bold;">+${l.lateMinutes} mins</td>
                <td style="padding: 4px 10px; text-align: right; color: #e11d48; font-weight: bold;">-$${l.deductionAmount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div style="width: 794px; min-height: 1080px; box-sizing: border-box; padding: 36px 40px; background: #ffffff; color: #1e293b; font-family: 'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative;">
      
      <!-- Top Decorative Accent Bar -->
      <div style="height: 6px; background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%); border-radius: 4px 4px 0 0; margin: -36px -40px 24px -40px;"></div>

      <!-- Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #4f46e5;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; background: #4f46e5; border-radius: 10px; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; letter-spacing: -0.5px;">
              HR
            </div>
            <div>
              <h1 style="margin: 0; font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">
                SMART ATTENDANCE & PAYROLL SYSTEM
              </h1>
              <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #64748b; font-weight: 500;">
                ${language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានស្កេន QR & ប័ណ្ណបើកប្រាក់បៀវត្សផ្លូវការ' : 'Official Attendance Verification & Employee Salary Voucher'}
              </p>
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">
            ${language === 'km' ? `ប័ណ្ណប្រាក់ខែ: ${monthLabel} ${year}` : `Payslip: ${monthLabel} ${year}`}
          </div>
          <div style="margin-top: 5px; font-size: 9.5px; color: #94a3b8; font-family: monospace;">
            Voucher Ref: <span style="font-weight: 700; color: #475569;">${voucherRef}</span>
          </div>
          <div style="font-size: 9.5px; color: #94a3b8; font-family: monospace;">
            Issue Date: <span style="font-weight: 600; color: #475569;">${issueDate}</span>
          </div>
        </div>
      </div>

      <!-- Employee Profile & Shift Grid -->
      <div style="margin-top: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="width: 44px; height: 44px; border-radius: 8px; background: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; border: 1px solid #c7d2fe;">
              ${item.fullName.charAt(0)}
            </div>
            <div>
              <span style="display: inline-block; font-family: monospace; font-size: 9.5px; font-weight: 700; background: #4f46e5; color: #ffffff; padding: 1px 6px; border-radius: 4px;">
                ${item.employeeId}
              </span>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">
                ${item.fullNameKhmer || item.fullName}
              </div>
              <div style="font-size: 10px; color: #64748b;">
                ${item.fullName}
              </div>
            </div>
          </div>
          <div style="color: #475569; font-size: 10.5px; line-height: 1.5;">
            <div><strong>${language === 'km' ? 'ផ្នែក:' : 'Department:'}</strong> ${item.departmentKhmer || item.department}</div>
            <div><strong>${language === 'km' ? 'តួនាទី:' : 'Position:'}</strong> ${item.roleKhmer || item.role}</div>
          </div>
        </div>

        <div style="border-left: 1px solid #e2e8f0; padding-left: 16px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10.5px;">
          <div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">${language === 'km' ? 'វេន & ម៉ោងកំណត់:' : 'Shift Schedule:'}</span>
              <span style="font-weight: 700; font-family: monospace; color: #1e293b;">${item.workStartTime} - ${item.workEndTime} (${item.workingHoursPerDay}h/day)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">${language === 'km' ? 'ថ្ងៃធ្វើការក្នុងខែ:' : 'Scheduled Workdays:'}</span>
              <span style="font-weight: 600; color: #1e293b;">${item.totalScheduledWorkDays} ${language === 'km' ? 'ថ្ងៃ' : 'days'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">${language === 'km' ? 'វត្តមានជាក់ស្តែង:' : 'Actual Days Present:'}</span>
              <span style="font-weight: 700; color: #059669;">${item.daysPresent} ${language === 'km' ? 'ថ្ងៃ' : 'days'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 4px;">
              <span style="color: #64748b;">${language === 'km' ? 'គណនីធនាគារ:' : 'Bank Account:'}</span>
              <span style="font-weight: 600; font-family: monospace; color: #334155;">${item.bankAccount || 'ABA Bank (Configured)'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Metrics Row (Based on Attendance Scans) -->
      <div style="margin-top: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #065f46; text-transform: uppercase;">
            ${language === 'km' ? 'ស្កេនទាន់ពេល' : 'On-Time Scans'}
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #047857; font-family: monospace; margin-top: 2px;">
            ${item.onTimeScans}
          </div>
        </div>

        <div style="background: ${item.lateScans > 0 ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${item.lateScans > 0 ? '#fde68a' : '#e2e8f0'}; border-radius: 10px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: ${item.lateScans > 0 ? '#92400e' : '#64748b'}; text-transform: uppercase;">
            ${language === 'km' ? 'ស្កេនចូលយឺត' : 'Late Scans'}
          </div>
          <div style="font-size: 16px; font-weight: 900; color: ${item.lateScans > 0 ? '#b45309' : '#334155'}; font-family: monospace; margin-top: 2px;">
            ${item.lateScans}
          </div>
        </div>

        <div style="background: ${item.totalLateMinutes > 0 ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${item.totalLateMinutes > 0 ? '#fecdd3' : '#e2e8f0'}; border-radius: 10px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: ${item.totalLateMinutes > 0 ? '#9f1239' : '#64748b'}; text-transform: uppercase;">
            ${language === 'km' ? 'នាទីយឺតសរុប' : 'Total Late Mins'}
          </div>
          <div style="font-size: 16px; font-weight: 900; color: ${item.totalLateMinutes > 0 ? '#be123c' : '#334155'}; font-family: monospace; margin-top: 2px;">
            ${item.totalLateMinutes}<span style="font-size: 10px; font-weight: 400;">m</span>
          </div>
        </div>

        <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #3730a3; text-transform: uppercase;">
            ${language === 'km' ? 'កាត់ប្រាក់យឺតសរុប' : 'Late Deduction'}
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #e11d48; font-family: monospace; margin-top: 2px;">
            -$${item.lateDeductionAmount.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Financial Breakdown Table -->
      <div style="margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden;">
        <div style="background: #f1f5f9; padding: 8px 14px; font-size: 10.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1;">
          <span>${language === 'km' ? 'ព័ត៌មានលម្អិតប្រាក់បៀវត្ស & ការកាត់ប្រាក់ (Earnings & Deductions)' : 'Description & Financial Computations'}</span>
          <span>USD ($)</span>
        </div>

        <div style="font-size: 11px;">
          <!-- 1. Base Salary -->
          <div style="padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9;">
            <div>
              <span style="font-weight: 700; color: #0f172a;">${language === 'km' ? '១. ប្រាក់ខែគោលប្រចាំខែ (Base Salary)' : '1. Monthly Base Salary'}</span>
              <div style="font-size: 9.5px; color: #64748b;">${language === 'km' ? 'កំណត់ក្នុងកិច្ចសន្យាការងារផ្លូវការ' : 'Regular contracted monthly rate'}</div>
            </div>
            <span style="font-family: monospace; font-weight: 800; font-size: 12.5px; color: #0f172a;">$${item.baseSalary.toFixed(2)}</span>
          </div>

          <!-- Bonus (if any) -->
          ${item.bonus > 0 ? `
            <div style="padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background: #faf5ff;">
              <div>
                <span style="font-weight: 600; color: #6b21a8;">${language === 'km' ? '២. ប្រាក់លើកទឹកចិត្ត (Performance Bonus)' : '2. Performance Bonus'}</span>
              </div>
              <span style="font-family: monospace; font-weight: 700; color: #15803d;">+$${item.bonus.toFixed(2)}</span>
            </div>
          ` : ''}

          <!-- Allowances (if any) -->
          ${item.allowances > 0 ? `
            <div style="padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background: #faf5ff;">
              <div>
                <span style="font-weight: 600; color: #6b21a8;">${language === 'km' ? '៣. ប្រាក់ឧបត្ថម្ភផ្សេងៗ (Allowances)' : '3. Allowances & Benefits'}</span>
              </div>
              <span style="font-family: monospace; font-weight: 700; color: #15803d;">+$${item.allowances.toFixed(2)}</span>
            </div>
          ` : ''}

          <!-- Deductions: Late Scans -->
          <div style="padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background: #fff1f2;">
            <div>
              <span style="font-weight: 700; color: #be123c;">
                ${language === 'km' ? '៤. កាត់ប្រាក់តាមរយៈការស្កេនចូលយឺត (Late Check-in Deductions)' : '4. Attendance Deduction (Late Check-in Penalty)'}
              </span>
              <div style="font-size: 9.5px; color: #e11d48;">
                ${language === 'km'
                  ? `ស្កេនយឺត ${item.lateScans} លើក (${item.totalLateMinutes} នាទី) ធៀបម៉ោងចូលធ្វើការ ${item.workStartTime}`
                  : `Computed from ${item.lateScans} late scan event(s), totaling ${item.totalLateMinutes} late minute(s)`}
              </div>
            </div>
            <span style="font-family: monospace; font-weight: 800; font-size: 12.5px; color: #e11d48;">
              -${item.lateDeductionAmount > 0 ? `$${item.lateDeductionAmount.toFixed(2)}` : '$0.00'}
            </span>
          </div>

          <!-- Other deductions (if any) -->
          ${item.otherDeductions > 0 ? `
            <div style="padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9;">
              <div>
                <span style="font-weight: 600; color: #475569;">${language === 'km' ? '៥. ការកាត់ផ្សេងៗ (Other Deductions)' : '5. Other Deductions'}</span>
              </div>
              <span style="font-family: monospace; font-weight: 700; color: #e11d48;">-$${item.otherDeductions.toFixed(2)}</span>
            </div>
          ` : ''}

          <!-- Net Pay Row -->
          <div style="padding: 12px 14px; background: #eef2ff; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #4f46e5;">
            <div>
              <div style="font-weight: 900; font-size: 13px; color: #1e1b4b; letter-spacing: 0.2px;">
                ${language === 'km' ? 'ប្រាក់បៀវត្សសុទ្ធជាក់ស្តែង (NET SALARY PAYABLE)' : 'NET SALARY DISBURSEMENT'}
              </div>
              <div style="font-size: 9.5px; color: #4338ca;">
                ${language === 'km' ? 'ចំនួនទឹកប្រាក់ត្រូវផ្ទេរចូលគណនីបុគ្គលិក' : 'Final net amount transferred to employee bank account'}
              </div>
            </div>
            <div style="font-family: monospace; font-weight: 900; font-size: 18px; color: #4338ca;">
              $${item.netPay.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <!-- Itemized Late Scan Logs (if any) -->
      ${lateLogsHtml}

      <!-- Signatures & Official Approvals Block -->
      <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 10px; color: #64748b;">
        <div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 45px;">
            ${language === 'km' ? 'អ្នករៀបចំ (Prepared By)' : 'Prepared By'}
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 5px; font-weight: 600; color: #334155;">
            HR & Payroll Officer
          </div>
        </div>

        <div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 45px;">
            ${language === 'km' ? 'អ្នកអនុម័ត (Approved By)' : 'Approved By'}
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 5px; font-weight: 600; color: #334155;">
            Finance & Managing Director
          </div>
        </div>

        <div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 45px;">
            ${language === 'km' ? 'ហត្ថលេខាបុគ្គលិក (Employee Signature)' : 'Employee Signature & Date'}
          </div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 5px; font-weight: 600; color: #334155;">
            ${item.fullNameKhmer || item.fullName}
          </div>
        </div>
      </div>

      <!-- Footer Audit Note -->
      <div style="margin-top: 24px; text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        This document is electronically verified and issued by Smart Attendance QR System.
        Attendance records reflect biometric/QR terminal logs at office premises.
      </div>

    </div>
  `;
}

/**
 * Generate and download formatted PDF salary slips for selected employee items
 */
export async function exportPayslipsToPdf(
  items: EmployeePayrollItem[],
  month: number,
  year: number,
  language: Language,
  mode: 'merged' | 'individual' = 'merged',
  onProgress?: (progress: PdfExportProgress) => void
): Promise<void> {
  if (!items || items.length === 0) {
    throw new Error('No employee items selected for PDF export');
  }

  // Create temporary container off-screen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-1000';
  document.body.appendChild(container);

  // Shared options ensuring isolated rendering free of conflicting Tailwind v4 oklch rules
  const html2canvasOptions = {
    scale: 2, // High DPI for crisp rendering
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc: Document) => {
      // Strip Tailwind v4 / external stylesheets from the clone to prevent oklch color parsing errors
      const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((s) => {
        const href = s.getAttribute('href') || '';
        if (!href.includes('fonts.googleapis.com')) {
          s.remove();
        }
      });

      const resetStyle = clonedDoc.createElement('style');
      resetStyle.textContent = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #ffffff; color: #1e293b; font-family: 'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
      clonedDoc.head.appendChild(resetStyle);
    }
  };

  try {
    if (mode === 'merged') {
      // 1. Single multi-page PDF document containing all selected employees
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210; // A4 mm
      const pageHeight = 297; // A4 mm

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: items.length,
            employeeName: item.fullName
          });
        }

        // Render HTML into container
        container.innerHTML = createPayslipHtml(item, month, year, language);

        // Allow micro-task rendering
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = await html2canvas(container, html2canvasOptions);

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        // Scale down if height slightly exceeds page
        if (imgHeight <= pageHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
        } else {
          // Scale to fit one page neatly
          const fitRatio = pageHeight / imgHeight;
          const fittedWidth = pageWidth * fitRatio;
          const xOffset = (pageWidth - fittedWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, 0, fittedWidth, pageHeight, undefined, 'FAST');
        }
      }

      const fileName = items.length === 1
        ? `Payslip_${items[0].employeeId}_${year}_${String(month).padStart(2, '0')}.pdf`
        : `Payslips_${year}_${String(month).padStart(2, '0')}_Selected_${items.length}_Staff.pdf`;

      pdf.save(fileName);

    } else {
      // 2. Individual PDF downloads for each selected employee
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: items.length,
            employeeName: item.fullName
          });
        }

        container.innerHTML = createPayslipHtml(item, month, year, language);
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = await html2canvas(container, html2canvasOptions);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        if (imgHeight <= pageHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
        } else {
          const fitRatio = pageHeight / imgHeight;
          const fittedWidth = pageWidth * fitRatio;
          const xOffset = (pageWidth - fittedWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, 0, fittedWidth, pageHeight, undefined, 'FAST');
        }

        const fileName = `Payslip_${item.employeeId}_${year}_${String(month).padStart(2, '0')}.pdf`;
        pdf.save(fileName);

        // Stagger downloads slightly to prevent browser blocking multiple popups
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
  } finally {
    // Clean up DOM node
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
