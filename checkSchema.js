const sql = require("mssql");
const { poolPromise } = require("./backend/config/db");

async function checkSchema() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME IN ('RestaurantOrderCur', 'RestaurantOrderDetailCur', 'RestaurantmodifierdetailCur')
      AND DATA_TYPE LIKE '%char%'
    `);
    console.table(result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
