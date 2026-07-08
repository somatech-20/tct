const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const json2csv = require('json2csv').parse;

// Main reporting page
exports.index = async (req, res) => {
    try {
        const { startDate, endDate, doctor, status, district, returnee, search } = req.query;

        // Build filter
        const filter = {};
        if (status && status !== '') filter.status = status;
        if (district && district !== '') filter.district = district;
        if (doctor && doctor !== '') filter.assignedDoctor = doctor;
        if (returnee !== undefined && returnee !== '') filter.isReturnee = returnee === 'true';
        if (search && search !== '') {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { patientId: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Get data for filters dropdown
        const doctors = await User.find({ role: 'doctor' }).select('fullName username');
        const districts = [
            'Hodan', 'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley',
            'Hamar-Jajab', 'Hamar-Weyne', 'Howl-Wadag', 'Huriwa', 'Kaxda',
            'Karan', 'Shangani', 'Shibis', 'Waberi', 'Wadajir',
            'Warta Nabada', 'Yaqshid', 'Daarusalaam', 'Garasbaaley', 'Gubadle'
        ];

        // Get filtered patients
        const patients = await Patient.find(filter)
            .populate('assignedDoctor', 'fullName username')
            .populate('registeredBy', 'fullName username')
            .sort('-createdAt');

        // Calculate statistics
        const stats = {
            total: patients.length,
            active: patients.filter(p => p.status === 'Active').length,
            recovered: patients.filter(p => p.status === 'Recovered').length,
            defaulted: patients.filter(p => p.status === 'Defaulted').length,
            returnee: patients.filter(p => p.isReturnee).length,
            male: patients.filter(p => p.gender === 'Male').length,
            female: patients.filter(p => p.gender === 'Female').length,
        };

        res.render('reports/index', {
            patients,
            stats,
            doctors,
            districts,
            filters: req.query
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Export with filters (POST)
exports.export = async (req, res) => {
    try {
        const { format, startDate, endDate, doctor, status, district, returnee, search } = req.body;

        // Build filter (same as above)
        const filter = {};
        if (status && status !== '') filter.status = status;
        if (district && district !== '') filter.district = district;
        if (doctor && doctor !== '') filter.assignedDoctor = doctor;
        if (returnee !== undefined && returnee !== '') filter.isReturnee = returnee === 'true';
        if (search && search !== '') {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { patientId: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const patients = await Patient.find(filter)
            .populate('assignedDoctor', 'fullName username')
            .populate('registeredBy', 'fullName username');

        // Export based on format
        if (format === 'pdf') {
            return exportPDF(patients, res);
        } else if (format === 'excel') {
            return exportExcel(patients, res);
        } else if (format === 'csv') {
            return exportCSV(patients, res);
        } else {
            return res.status(400).json({ error: 'Invalid format' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Export failed');
    }
};

// Helper: Export as PDF
// Helper: Export as PDF - Professional Design
const exportPDF = async (patients, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        bufferPages: true,
        margins: {
            top: 40,
            left: 40,
            right: 40,
            bottom: 60      // reserve footer space
        }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=TB_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // ===== COLORS =====
    const colors = {
        primary: '#1a365d',
        secondary: '#2b6cb0',
        accent: '#48bb78',
        danger: '#fc8181',
        text: '#2d3748',
        light: '#f7fafc',
        border: '#e2e8f0'
    };

    // ===== HEADER =====
    // Top bar with gradient
    doc.rect(0, 0, doc.page.width, 120)
        .fill('#1a365d');

    // Logo/Title
    doc.fillColor('#ffffff')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('TB Case Tracer', 40, 35, { width: 400 });

    doc.fontSize(12)
        .font('Helvetica')
        .text('Patient Report - Comprehensive Analysis', 40, 70);

    // Date
    doc.fontSize(10)
        .text(`Generated: ${new Date().toLocaleString()}`, 40, 92);

    // Right side stats badge
    doc.rect(doc.page.width - 180, 25, 140, 75)
        .fill('#2b6cb0');

    doc.fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Total Patients', doc.page.width - 170, 35);

    doc.fontSize(24)
        .text(patients.length.toString(), doc.page.width - 170, 55);

    // ===== SUMMARY STATISTICS =====
    let y = 160;

    // Section title
    doc.fillColor(colors.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('📊 Summary Statistics', 40, y);

    y += 25;

    // Draw stats in a grid (3 columns)
    const stats = [
        { label: 'Active Cases', value: patients.filter(p => p.status === 'Active').length, color: colors.accent },
        { label: 'Recovered', value: patients.filter(p => p.status === 'Recovered').length, color: colors.secondary },
        { label: 'Defaulted', value: patients.filter(p => p.status === 'Defaulted').length, color: colors.danger },
        { label: 'Male', value: patients.filter(p => p.gender === 'Male').length, color: '#4299e1' },
        { label: 'Female', value: patients.filter(p => p.gender === 'Female').length, color: '#ed64a6' },
        { label: 'Returnee', value: patients.filter(p => p.isReturnee).length, color: '#ed8936' }
    ];

    const colWidth = (doc.page.width - 80) / 3;
    const rowHeight = 60;

    stats.forEach((stat, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = 40 + col * colWidth;
        const yPos = y + row * rowHeight;

        // Card background
        doc.roundedRect(x, yPos, colWidth - 10, 50, 5)
            .fill('#f7fafc')
            .stroke(colors.border);

        // Value
        doc.fillColor(stat.color)
            .fontSize(22)
            .font('Helvetica-Bold')
            .text(stat.value.toString(), x + 15, yPos + 12);

        // Label
        doc.fillColor(colors.text)
            .fontSize(9)
            .font('Helvetica')
            .text(stat.label, x + 15, yPos + 32);
    });

    y += 130;

    // ===== PATIENT TABLE =====
    doc.fillColor(colors.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('📋 Patient List', 40, y);

    y += 25;

    // Table headers
    const tableHeaders = ['Patient ID', 'Name', 'District', 'Doctor', 'Status', 'Returnee'];
    const colWidths = [75, 140, 100, 110, 70, 60];
    let tableY = y;

    // Header background
    doc.rect(40, tableY, doc.page.width - 80, 25)
        .fill(colors.primary);

    // Header text
    doc.fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold');

    let xPos = 45;
    tableHeaders.forEach((header, i) => {
        doc.text(header, xPos, tableY + 7, { width: colWidths[i] });
        xPos += colWidths[i];
    });

    tableY += 25;

    // Table rows
    doc.font('Helvetica')
        .fontSize(8);

    patients.forEach((patient, index) => {
        // Check if we need a new page
        if (tableY > doc.page.height - doc.page.margins.bottom - 20) {
            doc.addPage();
            tableY = 50;

            // Redraw header on new page
            doc.rect(40, tableY, doc.page.width - 80, 25)
                .fill(colors.primary);
            doc.fillColor('#ffffff')
                .fontSize(9)
                .font('Helvetica-Bold');

            xPos = 45;
            tableHeaders.forEach((header, i) => {
                doc.text(header, xPos, tableY + 7, { width: colWidths[i] });
                xPos += colWidths[i];
            });
            tableY += 25;
            doc.font('Helvetica').fontSize(8);
        }

        // Alternating row colors
        if (index % 2 === 0) {
            doc.rect(40, tableY, doc.page.width - 80, 20)
                .fill('#f7fafc');
        }

        doc.fillColor(colors.text);
        xPos = 45;

        const rowData = [
            patient.patientId || 'N/A',
            patient.fullName.length > 15 ? patient.fullName.substring(0, 15) + '...' : patient.fullName,
            patient.district || 'N/A',
            patient.assignedDoctor ? (patient.assignedDoctor.fullName || patient.assignedDoctor.username).substring(0, 12) : 'Unassigned',
            patient.status,
            patient.isReturnee ? 'Yes' : 'No'
        ];

        rowData.forEach((value, i) => {
            // Color coding for status
            if (i === 4) {
                const statusColors = {
                    'Active': '#48bb78',
                    'Recovered': '#4299e1',
                    'Defaulted': '#fc8181'
                };
                doc.fillColor(statusColors[value] || colors.text);
            } else {
                doc.fillColor(colors.text);
            }
            doc.text(value, xPos, tableY + 5, { width: colWidths[i] });
            xPos += colWidths[i];
        });

        tableY += 20;
    });

    // // ===== FOOTER =====
    // const footerY = doc.page.height - 30;
    // doc.moveTo(40, footerY)
    //     .lineTo(doc.page.width - 40, footerY)
    //     .stroke(colors.border);

    // const pageCount = doc.bufferedPageRange().count;
    // doc.fillColor('#718096')
    //     .fontSize(8)
    //     .font('Helvetica')
    //     .text(`Generated by TB Case Tracer System • Page ${doc.pageNumber} of ${pageCount}`, 40, footerY + 8);

    // doc.end();
    // ===== FOOTERS =====
    const range = doc.bufferedPageRange(); // { start: 0, count: N }

    for (let i = range.start; i < range.start + range.count; i++) {

        doc.switchToPage(i);

        const footerY = doc.page.height - 35;

        // Divider
        doc.moveTo(40, footerY)
            .lineTo(doc.page.width - 40, footerY)
            .stroke(colors.border);

        // Left text
        doc.fillColor('#718096')
            .fontSize(8)
            .font('Helvetica')
            .text(
                'Generated by TB Case Tracer System',
                40,
                footerY + 8,
                {
                    lineBreak: false
                }
            );

        // Right page number
        doc.text(
            `Page ${i + 1} of ${range.count}`,
            0,
            footerY + 8,
            {
                align: 'right',
                width: doc.page.width - 40,
                lineBreak: false
            }
        );
    }

    doc.end();
};

// Helper: Export as Excel
const exportExcel = async (patients, res) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Report');

    ws.columns = [
        { header: 'Patient Name', key: 'fullName', width: 25 },
        { header: 'Patient ID', key: 'patientId', width: 15 },
        { header: 'Age', key: 'age', width: 10 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Marital Status', key: 'maritalStatus', width: 15 },
        { header: 'District', key: 'district', width: 20 },
        { header: 'TB Type', key: 'tbType', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Returnee', key: 'isReturnee', width: 10 },
        { header: 'Assigned Doctor', key: 'doctor', width: 25 },
        { header: 'Registered By', key: 'registered', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    patients.forEach(p => {
        ws.addRow({
            fullName: p.fullName,
            patientId: p.patientId || 'N/A',
            age: p.age,
            gender: p.gender,
            maritalStatus: p.maritalStatus || 'N/A',
            district: p.district || 'N/A',
            tbType: p.tbType,
            status: p.status,
            isReturnee: p.isReturnee ? 'Yes' : 'No',
            doctor: p.assignedDoctor ? p.assignedDoctor.fullName || p.assignedDoctor.username : 'Unassigned',
            registered: p.registeredBy ? p.registeredBy.fullName || p.registeredBy.username : 'N/A',
            createdAt: p.createdAt ? p.createdAt.toISOString().split('T')[0] : 'N/A'
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
};

// Helper: Export as CSV
const exportCSV = async (patients, res) => {
    const fields = ['fullName', 'patientId', 'age', 'gender', 'district', 'tbType', 'status', 'isReturnee', 'createdAt'];
    const csv = json2csv(patients, { fields });

    res.header('Content-Type', 'text/csv');
    res.attachment(`report_${Date.now()}.csv`);
    res.send(csv);
};