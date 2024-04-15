const { query } = require('express');
const OrderDb = require('../model/ordermodel');
const PDFDocument = require('pdfkit-table');

exports.renderReportPage= async (req, res) => {
    res.render('admin/salesreport');
}

exports.generateReport = async (req, res) => {
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
        } else {
            res.status(400).json({ message: 'Invalid report type' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error!")
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

        doc.fontSize(20).text(`RISHI STUDIO`, { align: 'center' });
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
    console.log(startDate, endDate);
    const orders = await OrderDb.find({ orderDate: { $gte: startDate, $lte: endDate }}).populate('orderedItems.productId').populate('couponApplied');
    // console.log(orders);
    
    let dailySalesData = [];

    orders.forEach(order => {
        let totalSales = 0;
        let totalOrderAmount = order.totalAmount;
        let totalDiscount = 0;
        let totalCouponDiscount = 0;

        order.orderedItems.forEach(item => {
            totalSales += item.quantity;
            const productPrice = item.originalPrice * item.quantity;
            const discountedPrice = item.price  * item.quantity;
            const discountAmount = productPrice - discountedPrice;
            totalDiscount += Math.round(discountAmount + item.offerDiscount);
        });

        if (order.couponApplied!==null) {
            totalCouponDiscount += order.couponApplied.discountAmount;
        }

        dailySalesData.push({
            date: order.orderDate,
            totalSales,
            totalOrderAmount,
            totalDiscount,
            totalCouponDiscount,
        });
    });

    // Sort the daily sales data by order date in ascending order
    dailySalesData.sort((a, b) => a.date - b.date);

    return dailySalesData;
}

exports.generateInvoice = async (req, res) => {
    try {
      const orderId = req.params.oid;
      const order = await OrderDb.findById(orderId)
        .populate('couponApplied shippingAddress')
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      const doc = new PDFDocument();
      // Set content disposition to attachment so that the browser will prompt the user to download the PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=order_invoice.pdf');
      doc.pipe(res);
  
      // Add content to the PDF document based on the order details
      doc.image('public/img/landing/dp.png', {
        width: 50,
        align: 'right'
      }).moveDown(0.5);
  
      // Helper function to add underlined text
      function addUnderlinedText(text, fontSize = 12, align = 'left') {
        const textWidth = doc.widthOfString(text);
        const textHeight = doc.heightOfString(text, { width: textWidth });
        const startX = align === 'center' ? (doc.page.width - textWidth) / 2 : align === 'right' ? doc.page.width - textWidth : 0;
        const startY = doc.y;
  
        doc.fontSize(fontSize).text(text, { align });
        doc.moveDown(0.5); // Add some vertical space after the text
        doc.lineWidth(1).moveTo(startX, startY + textHeight + 2).lineTo(startX + textWidth, startY + textHeight + 2).stroke();
      }
  
      doc.fontSize(20).text('RISHI STUDIO', { align: 'center' });
      doc.moveDown(0.5);
      addUnderlinedText('Order Invoice', 18, 'center');
      doc.moveDown();
  
      // Order details
      doc.fontSize(12).text(`Order ID: ${order._id}`);
      doc.moveDown();
      doc.fontSize(13).text(`Order Date: ${order.orderDate.toDateString()}`);
      doc.moveDown();
      doc.fontSize(12).text(`Payment Status: ${order.paymentStatus}`);
      doc.fontSize(12).text(`Payment Method: ${order.paymentMethod}`);
      doc.moveDown();
  
  
      // User details
      doc.fontSize(13).text(`${order.name}`);
      doc.fontSize(12).text(`${order.shippingAddress.address},`);
      doc.fontSize(12).text(`${order.shippingAddress.city}, ${order.shippingAddress.state},`);
      doc.fontSize(12).text(`${order.shippingAddress.pincode}`);
      doc.moveDown();
  
      // Ordered items
      // Ordered items
      order.orderedItems.forEach(async (item) => {
        doc.fontSize(12).text(`Product: ${item.pname}`);
        doc.fontSize(12).text(`Quantity: ${item.quantity}`);
        doc.fontSize(12).text(`Price: $${item.price}`);
        doc.fontSize(12).text(`Offer Discount: $${item.offerDiscount}`)
  
        doc.moveDown();
      });
  
      if(order.couponApplied!=null){
        doc.fontSize(12).text(`Coupon reduction: $${order.couponApplied.discountAmount}`);
      }
  
      // Total amount
      doc.fontSize(14).text(`Total Amount: Rs.${order.totalAmount}/-`, { align: 'right' });
  
      doc.end();
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };