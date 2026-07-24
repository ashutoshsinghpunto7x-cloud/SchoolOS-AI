require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('salaryrecords');

  const names = ['Rajesh Dwivedii', 'Vijay Kumar Dixit', 'Arvind Dwivedi', 'Sanjay Kumar', 'Pushpa Sharma', 'Purushottam Maurya', 'Ashok Kumar Gupta'];

  const result = await coll.updateMany(
    { employeeName: { $in: names }, month: 'July', year: 2026, status: 'paid', updatedBy: 'Aditya Singh', paymentMode: 'bank_transfer' },
    { $set: { status: 'pending' }, $unset: { paidDate: '', paymentMode: '', updatedBy: '' } },
  );
  console.log('Reverted', result.modifiedCount, 'records');

  const after = await coll.find({ employeeName: { $in: names }, month: 'July', year: 2026 }).toArray();
  after.forEach(r => console.log(r.employeeName, '|', r.status, '|', r.paidDate, '|', r.paymentMode, '|', r.updatedBy));
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
