import csv
import re

def process_words_file(input_file, output_file):
    # 读取文件内容
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 去除类别信息 (如 A. (103), B. (105), C. (144)...)
    category_pattern = re.compile(r"^[A-Z]\.\s*\(\d+\)\s*$", re.MULTILINE)
    content = category_pattern.sub('', content)
    
    # 使用更精确的模式匹配单词条目
    # 匹配格式: 序号. 单词 [发音]: 词义
    word_pattern = re.compile(r"^\d+\.\s+([^[\n]+?)\s*\[([^\]]+)\]:\s*(.+?)(?=\n\d+\.|$)", re.DOTALL | re.MULTILINE)
    
    matches = word_pattern.findall(content)
    
    # 创建 CSV 文件
    with open(output_file, 'w', encoding='utf-8', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        # 写入表头
        csv_writer.writerow(['word', 'pronunciation', 'translation'])
        
        for match in matches:
            word = match[0].strip()
            pronunciation = match[1].strip()
            # 处理多行翻译，替换换行符为空格
            translation = re.sub(r'\s+', ' ', match[2].strip())
            csv_writer.writerow([word, pronunciation, translation])
    
    print(f"转换完成！CSV 文件已保存为: {output_file}")

# 输入文件路径和输出文件路径
input_file = 'words.txt'
output_file = 'words.csv'

process_words_file(input_file, output_file)