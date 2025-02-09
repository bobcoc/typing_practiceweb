const { MongoClient } = require("mongodb");
const XLSX = require("xlsx");

const uri = "mongodb://192.168.0.89:27017/typeskill"; // MongoDB 连接 URI
const dbName = "typeskill"; // 数据库名
const usersCollectionName = "users"; // 用户集合名
const recordsCollectionName = "practicerecords"; // 练习记录集合名

async function exportToExcel() {
  const client = new MongoClient(uri);

  try {
    console.log("连接到 MongoDB...");
    await client.connect();
    console.log("MongoDB 连接成功！");

    const db = client.db(dbName);
    const usersCollection = db.collection(usersCollectionName);
    const recordsCollection = db.collection(recordsCollectionName);

    // **步骤 1：提取用户数据**
    console.log("开始提取用户数据...");
    const users = await usersCollection
      .find({ username: { $regex: /^(202310|202410)/ } }, { projection: { username: 1, fullname: 1 } })
      .toArray();

    console.log(`共找到 ${users.length} 位用户：`, users);

    // **步骤 2：提取练习记录数据**
    console.log("开始提取练习记录数据...");
    const pipeline = [
      {
        $match: {
          username: { $regex: /^(202310|202410)/ }, // 匹配 username 以 202310 或 202410 开头
          "stats.startTime": { $gte: new Date("2024-12-21T00:00:00Z") } // startTime 条件
        }
      },
      {
        $group: {
          _id: "$username", // 按 username 分组
          totalCorrectWords: { $sum: "$stats.correctWords" } // 汇总 correctWords
        }
      },
      {
        $sort: { _id: 1 } // 按 username 升序排序
      }
    ];

    const records = await recordsCollection.aggregate(pipeline).toArray();

    console.log(`共找到 ${records.length} 条练习记录：`, records);

    // **步骤 3：匹配用户和练习记录，并计算等级**
    console.log("开始匹配用户、练习记录，并计算等级...");
    const usernameToRecordMap = new Map();
    records.forEach(record => {
      usernameToRecordMap.set(record._id, record.totalCorrectWords);
    });

    const finalData = users.map(user => {
      const correctWords = usernameToRecordMap.get(user.username) || 0; // 如果没有记录，设置为 0
      const grade = correctWords >= 150 ? "A" : "B"; // 计算等级
      return {
        Username: user.username,
        Fullname: user.fullname || "N/A",
        CorrectWords: correctWords,
        Grade: grade
      };
    });

    console.log("匹配完成，准备导出数据：", finalData);

    // **步骤 4：生成 Excel 文件**
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "StudentRecords");

    const filePath = "./student_records_with_grades.xlsx";
    XLSX.writeFile(workbook, filePath);

    console.log(`Excel 文件已生成: ${filePath}`);
  } catch (err) {
    console.error("出错了：", err);
  } finally {
    await client.close();
    console.log("MongoDB 连接已关闭！");
  }
}

exportToExcel();
