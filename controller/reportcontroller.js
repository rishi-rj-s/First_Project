const { query } = require('express');
const Categorydb =require('../model/categorymodel');
const Productdb =require('../model/productmodel');
const Cartdb =require('../model/cartmodel');
const Userdb = require('../model/usermodel');
const Orderdb = require('../model/ordermodel');
const PDFDocument = require('pdfkit-table');

const { startOfWeek, endOfWeek, format, addDays } = require('date-fns');

// exports.salesdata = async (req, res) => {
//     try {
//         // Calculate start and end dates for the current week
//         const startDate = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday is the start of the week
//         const endDate = endOfWeek(new Date(), { weekStartsOn: 0 });

//         // Query to get sales data per day for the current week
//         const salesData = await Orderdb.aggregate([
//             {
//                 $match: {
//                     orderedDate: { $gte: startDate, $lte: endDate } // Filter orders for the current week
//                 }
//             },
//             {
//                 $project: {
//                     orderedDate: 1,
//                     items: 1,
//                     dayOfWeek: { $dayOfWeek: "$orderedDate" } // Add dayOfWeek field
//                 }
//             },
//             {
//                 $unwind: "$items" // Unwind the items array to get separate documents for each item
//             },
//             {
//                 $group: {
//                     _id: "$dayOfWeek", 
//                     totalSales: { $sum: "$items.quantity" } 
//                 }
//             },
//             {
//                 $sort: { _id: 1 } 
//             }
//         ]);

//         const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Sunday first
//         const sales = [0, 0, 0, 0, 0, 0, 0]; // Initialize with 0 sales for each day

//         salesData.forEach(item => {
//             sales[item._id - 1] = item.totalSales; // Update sales array with fetched data
//         });

//         res.json({ labels, sales });
//     } catch (error) {
//         console.error(error);
//          res.render('404');
//     }
// };

// exports.salesamountdata = async (req, res) => {
//     try {
//         // Calculate start and end dates for the current week
//         const startDate = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday is the start of the week
//         const endDate = endOfWeek(new Date(), { weekStartsOn: 0 });

//         // Query to get sales amount per day for the current week
//         const weeklySalesAmountData = await Orderdb.aggregate([
//             {
//                 $match: {
//                     orderedDate: { $gte: startDate, $lte: endDate } // Filter orders for the current week
//                 }
//             },
//             {
//                 $group: {
//                     _id: { $dayOfWeek: "$orderedDate" }, // Group by day of the week
//                     totalAmount: { $sum: "$totalAmount" } // Sum up the total amount of sales per day
//                 }
//             },
//             {
//                 $sort: { _id: 1 } // Sort by day of the week
//             }
//         ]);

//         // Formatting data for chart
//         const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Sunday first
//         const salesAmount = [0, 0, 0, 0, 0, 0, 0]; // Initialize with 0 sales for each day

//         // Assign total sales amount for each day of the week
//         weeklySalesAmountData.forEach(item => {
//             salesAmount[item._id - 1] = item.totalAmount;
//         });

//         res.json({ labels, salesAmount });
//     } catch (error) {
//         console.error(error);
//          res.render('404');
//     }
// };

// exports.monthlysalesdata = async (req, res) => {
//     try {
//         // Query to get monthly sales data (grouping by the month of orderedDate)
//         const monthlySalesData = await Orderdb.aggregate([
//             {
//                 $unwind: "$items" 
//             },
//             {
//                 $group: {
//                     _id: { $month: "$orderedDate" },
//                     totalSales: { $sum: "$items.quantity" } 
//                 }
//             }
//         ]);
        
//         const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//         const sales = Array(12).fill(0); 
//         monthlySalesData.forEach(item => {
//             sales[item._id - 1] = item.totalSales; 
//         });
//         res.json({ labels, sales });
//     } catch (error) {
//         console.error(error);
//          res.render('404');
//     }
// };

// exports.monthlysalesamountdata = async (req, res) => {
//     try {
//         // Query to get monthly sales data (grouping by the month of orderedDate)
//         const monthlySalesData = await Orderdb.aggregate([
//             {
//                 $group: {
//                     _id: { $month: "$orderedDate" },
//                     totalAmount: { $sum: "$totalAmount" }
//                 }
//             }
//         ]);
//         // Formatting data for chart
//         const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//         const salesAmount = Array(12).fill(0); // Initialize with 0 sales for each month
//         monthlySalesData.forEach(item => {
//             salesAmount[item._id - 1] = item.totalAmount; // Update sales amount array with fetched data
//         });
//         res.json({ labels, salesAmount });
//     } catch (error) {
//         console.error(error);
//          res.render('404');
//     }
// }
// exports.yearlysalesdata = async (req, res) => {
//     try {
//         const currentYear = new Date().getFullYear();
//         const startYear = currentYear - 4;

//         // Query to get yearly sales data for the last 4 years along with the current year
//         const yearlySalesData = await Orderdb.aggregate([
//             {
//                 $match: {
//                     orderedDate: { $gte: new Date(startYear, 0, 1) } // Start from January 1st of the start year
//                 }
//             },
//             {
//                 $unwind: "$items" // Unwind the items array to get separate documents for each item
//             },
//             {
//                 $group: {
//                     _id: { $year: "$orderedDate" },
//                     totalSales: { $sum: "$items.quantity" }  
//                 }
//             }
//         ]);
        

//         const labels = Array.from({ length: 5 }, (_, i) => startYear + i); 
//         const sales = Array(5).fill(0); // Initialize with 0 sales for each year

//         yearlySalesData.forEach(item => {
//             const index = item._id - startYear;
//             if (index >= 0 && index < 5) {
//                 sales[index] = item.totalSales;
//             }
//         });

//         res.json({ labels, sales });
//     } catch (error) {
//         console.error(error);
//         res.render('404');
//     }
// };

// exports.yearlysalesamountdata = async (req, res) => {
//     try {
//         const currentYear = new Date().getFullYear();
//         const startYear = currentYear - 4;

//         // Query to get yearly sales amount data for the last 4 years along with the current year
//         const yearlySalesAmountData = await Orderdb.aggregate([
//             {
//                 $match: {
//                     orderedDate: { $gte: new Date(startYear, 0, 1) } // Start from January 1st of the start year
//                 }
//             },
//             {
//                 $group: {
//                     _id: { $year: "$orderedDate" },
//                     totalAmount: { $sum: "$totalAmount" } // Summing up total amount of orders per year
//                 }
//             }
//         ]);

//         const labels = Array.from({ length: 5 }, (_, i) => startYear + i); // Generate labels for the last 4 years and the current year
//         const salesAmount = Array(5).fill(0); // Initialize with 0 sales amount for each year

//         // Update sales amount data for each year
//         yearlySalesAmountData.forEach(item => {
//             const index = item._id - startYear;
//             if (index >= 0 && index < 5) {
//                 salesAmount[index] = item.totalAmount;
//             }
//         });

//         res.json({ labels, salesAmount });
//     } catch (error) {
//         console.error(error);
//          res.render('404');
//     }
// };


exports.salesreport= async (req, res) => {
    res.render('salesreport')
}

exports.generatereport = async (req, res) => {
    try {
        const { filterType, startDate, endDate, reportType } = req.query;

        let salesData;
        let dailySalesData;
        let reportTitle;

        if (filterType === 'daily') {
            salesData = await getDailySales();
            dailySalesData = salesData;
            reportTitle = 'Today';
        } else if (filterType === 'weekly') {
            salesData = await getWeeklySales();
            dailySalesData = salesData;
            reportTitle = `This Week`;
        } else if (filterType === 'monthly') {
            salesData = await getMonthlySales();
            dailySalesData = salesData;
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            reportTitle = monthNames[new Date().getMonth()]; // Use current month if no startDate provided
        } else if (filterType === 'yearly') {
            salesData = await getYearlySales();
            dailySalesData = salesData;
            reportTitle = `Yearly Sales Report (${new Date().getFullYear()})`;
        } else if (filterType === 'custom') {
            if (!startDate || !endDate) {
                throw new Error('Custom date range requires both start date and end date.');
            }
            salesData = await getCustomRangeSales(startDate, endDate);
            dailySalesData = salesData;
            reportTitle = `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
        }

        if (reportType === 'pdf') {
            generatePDFReport(res, reportTitle, salesData, dailySalesData); // Pass dailySalesData here
        } else if (reportType === 'excel') {
            generateExcelReport(res, reportTitle, salesData, dailySalesData);
        } else {
            res.status(400).json({ message: 'Invalid report type' });
        }
    } catch (error) {
        console.error(error);
         res.render('404');
    }
};

async function generatePDFReport(res, reportTitle, salesData, dailySalesData) {
    try {
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename=sales_report.pdf`, // inline for preview
                'Content-Length': pdfData.length
            });
            res.end(pdfData);
        });

        doc.fontSize(20).text(`LOOM & LACE`, { align: 'center' });
        doc.fontSize(18).text(`Sales Report (${reportTitle})`, { align: 'center' });
        doc.moveDown();

        // Overall Sales Report Table
        doc.fontSize(16).text('Sales Report', { underline: true });
        const overallTableHeaders = ['Date', 'Total Sales', 'Total Order Amount', 'Total Discount', 'Total Coupon Discount'];
        const overallTableData = dailySalesData.map(({ date, totalSales, totalOrderAmount, totalDiscount, totalCouponDiscount }) => 
            [new Date(date).toLocaleDateString(), totalSales, 'Rs.' + totalOrderAmount, 'Rs.' + totalDiscount, 'Rs.' + totalCouponDiscount]
        );
        const { totalSalesSum, totalOrderAmountSum, totalDiscountSum, totalCouponDiscountSum } = calculateTotalSums(dailySalesData);
        generateTable(doc, overallTableHeaders, overallTableData, totalSalesSum, totalOrderAmountSum, totalDiscountSum, totalCouponDiscountSum);

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating PDF report' });
    }
}

function calculateTotalSums(dailySalesData) {
    let totalSalesSum = 0;
    let totalOrderAmountSum = 0;
    let totalDiscountSum = 0;
    let totalCouponDiscountSum = 0;

    dailySalesData.forEach(({ totalSales, totalOrderAmount, totalDiscount, totalCouponDiscount }) => {
        totalSalesSum += totalSales;
        totalOrderAmountSum += totalOrderAmount;
        totalDiscountSum += totalDiscount;
        totalCouponDiscountSum += totalCouponDiscount;
    });

    return {
        totalSalesSum,
        totalOrderAmountSum,
        totalDiscountSum,
        totalCouponDiscountSum
    };
}
async function generateTable(doc, headers, data, totalSalesSum, totalOrderAmountSum, totalDiscountSum, totalCouponDiscountSum) {
    const tableData = [...data, [ 'Total:', totalSalesSum, 'Rs.' + totalOrderAmountSum, 'Rs.' + totalDiscountSum, 'Rs.' + totalCouponDiscountSum]];

    doc.table({
        headers: headers,
        rows: tableData,
        widths: Array(headers.length).fill('*'), // Equal width for all columns
        heights: 20,
        headerRows: 1
    });
}
async function generateExcelReport(res, reportTitle, salesData, dailySalesData) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Sales', key: 'totalSales', width: 15 },
            { header: 'Total Order Amount', key: 'totalOrderAmount', width: 20 },
            { header: 'Total Discount', key: 'totalDiscount', width: 15 },
            { header: 'Total Coupon Discount', key: 'totalCouponDiscount', width: 20 }
        ];
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').value = `LOOM & LACE - ${reportTitle}`;
        worksheet.addRow(['Date', 'Total Sales', 'Total Order Amount', 'Total Discount', 'Total Coupon Discount']);

        // Add data rows
        dailySalesData.forEach(({ date, totalSales, totalOrderAmount, totalDiscount, totalCouponDiscount }) => {
            worksheet.addRow({ date: new Date(date).toLocaleDateString(), totalSales, totalOrderAmount: 'Rs.' + totalOrderAmount, totalDiscount: 'Rs.' + totalDiscount, totalCouponDiscount: 'Rs.' + totalCouponDiscount });
        });

        // Add total sums row
        const { totalSalesSum, totalOrderAmountSum, totalDiscountSum, totalCouponDiscountSum } = calculateTotalSums(dailySalesData);
        worksheet.addRow(['Total:', totalSalesSum, 'Rs.' + totalOrderAmountSum, 'Rs.' + totalDiscountSum, 'Rs.' + totalCouponDiscountSum]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating Excel report' });
    }
}

// Add the following function for yearly sales data retrieval
async function getYearlySales() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    return await getOrderData(startOfYear, endOfYear);
}


  
  // Helper functions to retrieve sales data based on different filter types
  async function getDailySales() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return await getOrderData(startOfDay, endOfDay);
  }
  
  async function getWeeklySales() {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7);
    return await getOrderData(startOfWeek, endOfWeek);
  }
  
  async function getMonthlySales() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return await getOrderData(startOfMonth, endOfMonth);
  }
  
  async function getCustomRangeSales(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await getOrderData(start, end);
  }
  
  async function getOrderData(startDate, endDate) {
    const orders = await Orderdb.find({ orderedDate: { $gte: startDate, $lt: endDate }}).populate('items.productId').populate('couponused');
    
    let dailySalesData = [];

    orders.forEach(order => {
        let totalSales = 0;
        let totalOrderAmount = order.totalAmount;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        order.items.forEach(item => {
            totalSales += item.quantity;
            const productPrice = item.productId.price * item.quantity;
            const discountedPrice = productPrice * (1 - (item.productId.discount / 100));
            const discountAmount = productPrice - discountedPrice;
            totalDiscount += Math.round(discountAmount);
        });

        if (order.couponused) {
            totalCouponDiscount += order.couponused.maxdiscount;
        }

        dailySalesData.push({
            date: order.orderedDate,
            totalSales,
            totalOrderAmount,
            totalDiscount,
            totalCouponDiscount
        });
    });

    // Sort the daily sales data by order date in ascending order
    dailySalesData.sort((a, b) => a.date - b.date);

    return dailySalesData;
}
