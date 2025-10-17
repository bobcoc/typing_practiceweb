import React, { useRef, useEffect, useState } from 'react';
import { Button, InputNumber, Checkbox, Upload, message, Space, Card, Row, Col, ConfigProvider } from 'antd';
import { DownloadOutlined, UploadOutlined, ClearOutlined, PlayCircleOutlined, PauseOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import './KMeansDemo.css';

interface Point {
  x: number;
  y: number;
  cluster?: number;
}

interface Centroid {
  x: number;
  y: number;
  color: string;
}

interface DistanceLine {
  pointIndex: number;
  centroidIndex: number;
  distance: number;
  isAssigned?: boolean; // 标记是否是已分配的连线（需要保留）
}

// 使用更加区分明显的颜色
const COLORS = [
  '#FF0000', // 红色
  '#0000FF', // 蓝色
  '#00FF00', // 绿色
  '#FF00FF', // 洋红
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#00FFFF', // 青色
  '#FFD700', // 金色
  '#FF1493', // 深粉红
  '#8B4513'  // 褐色
];

const KMeansDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [k, setK] = useState<number>(3);
  const [numPoints, setNumPoints] = useState<number>(50);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [distanceLines, setDistanceLines] = useState<DistanceLine[]>([]); // 当前正在显示的临时距离线
  const [assignedLines, setAssignedLines] = useState<DistanceLine[]>([]); // 已分配的永久连线
  const [processingPointIndex, setProcessingPointIndex] = useState<number>(-1);
  const [algorithmComplete, setAlgorithmComplete] = useState<boolean>(false);
  const [iteration, setIteration] = useState<number>(0);
  const [isEditingCentroids, setIsEditingCentroids] = useState<boolean>(false); // 是否正在编辑质心
  const [draggingCentroidIndex, setDraggingCentroidIndex] = useState<number>(-1); // 正在拖动的质心索引

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const POINT_RADIUS = 5;

  // 绘制画布
  useEffect(() => {
    drawCanvas();
  }, [points, centroids, showCoordinates, showLabels, distanceLines, assignedLines, processingPointIndex]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. 先绘制已分配的永久连线（使用质心颜色）
    assignedLines.forEach((line) => {
      const point = points[line.pointIndex];
      const centroid = centroids[line.centroidIndex];
      
      // 使用质心的颜色
      ctx.strokeStyle = centroid.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(centroid.x, centroid.y);
      ctx.stroke();

      // 在线段中央显示距离（使用质心颜色）
      const midX = (point.x + centroid.x) / 2;
      const midY = (point.y + centroid.y) / 2;
      ctx.fillStyle = centroid.color;
      ctx.font = 'bold 11px Arial';
      ctx.fillText(line.distance.toFixed(2), midX, midY);
    });

    // 2. 再绘制当前正在计算的临时距离线
    distanceLines.forEach((line, index) => {
      const point = points[line.pointIndex];
      const centroid = centroids[line.centroidIndex];
      
      // 使用质心颜色，最后一条（最短的）加粗高亮
      const isLast = index === distanceLines.length - 1;
      ctx.strokeStyle = centroid.color;
      ctx.lineWidth = isLast ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(centroid.x, centroid.y);
      ctx.stroke();

      // 在线段中央显示距离
      const midX = (point.x + centroid.x) / 2;
      const midY = (point.y + centroid.y) / 2;
      ctx.fillStyle = '#000';
      ctx.font = isLast ? 'bold 13px Arial' : '12px Arial';
      ctx.fillText(line.distance.toFixed(2), midX, midY);
    });

    // 绘制普通点
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, POINT_RADIUS, 0, Math.PI * 2);
      
      // 根据是否有连线来决定颜色（有连线=有质心=着色，无连线=无质心=灰色）
      const assignedLine = assignedLines.find(line => line.pointIndex === index);
      if (assignedLine) {
        ctx.fillStyle = centroids[assignedLine.centroidIndex]?.color || '#666';
      } else {
        ctx.fillStyle = '#666';
      }
      
      if (index === processingPointIndex) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      ctx.fill();

      // 显示标签 (A, B, C, D...)
      if (showLabels) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        const label = String.fromCharCode(65 + index); // A=65, B=66, ...
        ctx.fillText(label, point.x + 8, point.y - 8);
      }

      // 显示坐标
      if (showCoordinates) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        const yOffset = showLabels ? -20 : -8;
        ctx.fillText(`(${Math.round(point.x)}, ${Math.round(point.y)})`, point.x + 8, point.y + yOffset);
      }
    });

    // 绘制质心点
    centroids.forEach((centroid, index) => {
      ctx.beginPath();
      ctx.arc(centroid.x, centroid.y, POINT_RADIUS * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = centroid.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制质心标记
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`C${index + 1}`, centroid.x - 8, centroid.y - 15);

      if (showCoordinates) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(`(${Math.round(centroid.x)}, ${Math.round(centroid.y)})`, centroid.x + 12, centroid.y + 20);
      }
    });
  };

  // 生成随机点
  const generateRandomPoints = () => {
    const newPoints: Point[] = [];
    for (let i = 0; i < numPoints; i++) {
      newPoints.push({
        x: Math.random() * (CANVAS_WIDTH - 40) + 20,
        y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
      });
    }
    setPoints(newPoints);
    setCentroids([]);
    resetAlgorithm();
  };

  // 鼠标点击添加点或开始拖动质心
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRunning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) { // 左键
      // 如果正在编辑质心模式
      if (isEditingCentroids) {
        // 检查是否点击了某个质心附近（20像素范围内）
        const clickedCentroidIndex = centroids.findIndex(c => {
          const distance = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
          return distance < 20;
        });

        if (clickedCentroidIndex >= 0) {
          // 开始拖动质心
          setDraggingCentroidIndex(clickedCentroidIndex);
        }
        return;
      }

      // 正常模式：添加质心或数据点
      if (centroids.length < k) {
        // 添加质心
        setCentroids([...centroids, {
          x,
          y,
          color: COLORS[centroids.length % COLORS.length]
        }]);
      } else {
        // 添加普通点
        setPoints([...points, { x, y }]);
      }
    }
  };

  // 鼠标移动时拖动质心
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingCentroids || draggingCentroidIndex < 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 更新质心位置
    const newCentroids = [...centroids];
    newCentroids[draggingCentroidIndex] = {
      ...newCentroids[draggingCentroidIndex],
      x,
      y
    };
    setCentroids(newCentroids);
  };

  // 鼠标释放时停止拖动
  const handleCanvasMouseUp = () => {
    if (draggingCentroidIndex >= 0) {
      message.success(`质心C${draggingCentroidIndex + 1}已移动到新位置`);
      setDraggingCentroidIndex(-1);
    }
  };

  // 右键清除
  const handleCanvasRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setPoints([]);
    setCentroids([]);
    resetAlgorithm();
  };

  // 重置算法状态
  const resetAlgorithm = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setDistanceLines([]);
    setAssignedLines([]); // 清空已分配的连线
    setProcessingPointIndex(-1);
    setAlgorithmComplete(false);
    setIteration(0);
    setIsEditingCentroids(false); // 退出编辑模式
    setDraggingCentroidIndex(-1); // 停止拖动
  };

  // 计算距离
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // 执行一步K-Means算法
  const executeStep = async () => {
    if (centroids.length !== k) {
      message.warning(`请先设置 ${k} 个质心点！`);
      return;
    }

    if (points.length === 0) {
      message.warning('请先添加数据点！');
      return;
    }

    setIsRunning(true);

    // 阶段1: 为每个点分配最近的质心
    if (processingPointIndex < points.length - 1) {
      const nextIndex = processingPointIndex + 1;
      setProcessingPointIndex(nextIndex);

      // 计算当前点到所有质心的距离
      const distances: DistanceLine[] = centroids.map((centroid, cIndex) => ({
        pointIndex: nextIndex,
        centroidIndex: cIndex,
        distance: calculateDistance(points[nextIndex], centroid)
      }));

      // 逐条显示距离线（速度变慢）
      for (let i = 0; i < distances.length; i++) {
        setDistanceLines(distances.slice(0, i + 1));
        await new Promise(resolve => setTimeout(resolve, 800)); // 从300ms增加到800ms
      }

      // 找到最短距离
      const minDistance = Math.min(...distances.map(d => d.distance));
      const closestCentroid = distances.findIndex(d => d.distance === minDistance);

      // 高亮最短的线
      setDistanceLines([distances[closestCentroid]]);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 显示最短线段更长时间

      // 清除临时距离线
      setDistanceLines([]);

      // 添加连线（连线即代表分配关系，不需要单独的cluster属性）
      const assignedLine: DistanceLine = {
        pointIndex: nextIndex,
        centroidIndex: closestCentroid,
        distance: distances[closestCentroid].distance,
        isAssigned: true
      };
      setAssignedLines([...assignedLines, assignedLine]);

    } else if (processingPointIndex === points.length - 1) {
      // 阶段2: 所有点处理完毕，重新计算质心
      message.info(`第 ${iteration + 1} 次迭代：重新计算质心...`);
      
      const newCentroids = [...centroids];
      let centroidsChanged = false;

      for (let i = 0; i < k; i++) {
        // 通过assignedLines找到属于该簇的点
        const clusterPointIndices = assignedLines
          .filter(line => line.centroidIndex === i)
          .map(line => line.pointIndex);
        const clusterPoints = clusterPointIndices.map(idx => points[idx]);
        
        if (clusterPoints.length > 0) {
          const newX = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
          const newY = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
          
          if (Math.abs(newCentroids[i].x - newX) > 0.1 || Math.abs(newCentroids[i].y - newY) > 0.1) {
            centroidsChanged = true;
          }
          
          newCentroids[i] = {
            ...newCentroids[i],
            x: newX,
            y: newY
          };
        }
      }

      setCentroids(newCentroids);

      if (!centroidsChanged) {
        message.success('K-Means算法收敛，聚类完成！所有点保持与质心连接');
        setAlgorithmComplete(true);
        setIsRunning(false);
        // 算法完成，保持所有连线显示
      } else {
        // 继续下一轮迭代
        // 清空已分配的连线（点会自动变回灰色，因为没有连线了）
        setAssignedLines([]);
        setProcessingPointIndex(-1);
        setIteration(iteration + 1);
        setCurrentStep(0);
        message.info('质心已更新，所有点重置为灰色，开始新一轮迭代...');
      }
    }
  };

  // 保存到Excel
  const saveToExcel = () => {
    const data: any[] = [];
    
    // 添加数据点
    points.forEach((point, index) => {
      data.push({
        '类型': '数据点',
        '索引': index + 1,
        'X坐标': point.x.toFixed(2),
        'Y坐标': point.y.toFixed(2),
        '所属簇': point.cluster !== undefined ? `簇${point.cluster + 1}` : '未分配'
      });
    });

    // 添加质心
    centroids.forEach((centroid, index) => {
      data.push({
        '类型': '质心',
        '索引': index + 1,
        'X坐标': centroid.x.toFixed(2),
        'Y坐标': centroid.y.toFixed(2),
        '颜色': centroid.color
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KMeans数据');
    XLSX.writeFile(wb, 'kmeans_data.xlsx');
    message.success('数据已导出到Excel文件');
  };

  // 从Excel读取
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const newPoints: Point[] = [];
        const newCentroids: Centroid[] = [];

        jsonData.forEach(row => {
          if (row['类型'] === '数据点') {
            newPoints.push({
              x: parseFloat(row['X坐标']),
              y: parseFloat(row['Y坐标']),
              cluster: row['所属簇'] !== '未分配' ? parseInt(row['所属簇'].replace('簇', '')) - 1 : undefined
            });
          } else if (row['类型'] === '质心') {
            newCentroids.push({
              x: parseFloat(row['X坐标']),
              y: parseFloat(row['Y坐标']),
              color: row['颜色'] || COLORS[newCentroids.length % COLORS.length]
            });
          }
        });

        setPoints(newPoints);
        setCentroids(newCentroids);
        resetAlgorithm();
        message.success('数据已从Excel文件导入');
      } catch (error) {
        message.error('文件读取失败，请确保格式正确');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  // 开始编辑质心
  const startEditingCentroids = () => {
    setIsEditingCentroids(true);
    message.info('点击并拖动质心到新位置，完成后点击"完成编辑"');
  };

  // 完成编辑质心并重新聚类
  const finishEditingCentroids = () => {
    setIsEditingCentroids(false);
    // 清空所有连线（点会自动变回灰色，因为没有连线了）
    setAssignedLines([]);
    setProcessingPointIndex(-1);
    setAlgorithmComplete(false);
    setIteration(0);
    message.success('质心已更新，所有点已重置为灰色，可以重新开始聚类！');
  };

  return (
    <ConfigProvider>
      <div className="kmeans-demo-container" style={{ padding: '24px', backgroundColor: '#fff', minHeight: '100vh' }}>
      <Card title="K-Means 聚类算法演示" bordered={false}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space wrap size="middle">
              <Space>
                <span>点的数量:</span>
                <InputNumber 
                  min={1} 
                  max={200} 
                  value={numPoints} 
                  onChange={(val) => setNumPoints(val || 50)}
                  disabled={isRunning}
                />
                <Button 
                  type="primary" 
                  onClick={generateRandomPoints}
                  disabled={isRunning}
                >
                  生成随机点
                </Button>
              </Space>

              <Space>
                <span>K值 (质心数):</span>
                <InputNumber 
                  min={1} 
                  max={10} 
                  value={k} 
                  onChange={(val) => {
                    setK(val || 3);
                    setCentroids([]);
                    resetAlgorithm();
                  }}
                  disabled={isRunning}
                />
              </Space>

              <Checkbox 
                checked={showCoordinates} 
                onChange={(e) => setShowCoordinates(e.target.checked)}
              >
                显示坐标
              </Checkbox>

              <Checkbox 
                checked={showLabels} 
                onChange={(e) => setShowLabels(e.target.checked)}
              >
                显示标签(A,B,C...)
              </Checkbox>

              <Button 
                type="primary" 
                icon={isRunning ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={executeStep}
                disabled={algorithmComplete || centroids.length !== k || isEditingCentroids}
              >
                执行一步
              </Button>

              {algorithmComplete && (
                <>
                  <Button 
                    type="default"
                    onClick={isEditingCentroids ? finishEditingCentroids : startEditingCentroids}
                    style={{ 
                      backgroundColor: isEditingCentroids ? '#52c41a' : '#1890ff',
                      color: 'white',
                      borderColor: isEditingCentroids ? '#52c41a' : '#1890ff'
                    }}
                  >
                    {isEditingCentroids ? '完成编辑' : '修改质心'}
                  </Button>
                  {isEditingCentroids && (
                    <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      点击并拖动质心到新位置
                    </span>
                  )}
                </>
              )}

              <Button 
                icon={<ClearOutlined />}
                onClick={() => {
                  setPoints([]);
                  setCentroids([]);
                  resetAlgorithm();
                }}
                disabled={isRunning}
              >
                清空画布
              </Button>

              <Button 
                icon={<DownloadOutlined />}
                onClick={saveToExcel}
              >
                导出Excel
              </Button>

              <Upload
                beforeUpload={handleFileUpload}
                accept=".xlsx,.xls"
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} disabled={isRunning}>
                  导入Excel
                </Button>
              </Upload>
            </Space>
          </Col>

          <Col span={24}>
            <div style={{ textAlign: 'center' }}>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseDown={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onContextMenu={handleCanvasRightClick}
                style={{
                  border: '2px solid #d9d9d9',
                  cursor: isRunning ? 'not-allowed' : isEditingCentroids ? (draggingCentroidIndex >= 0 ? 'grabbing' : 'grab') : 'crosshair',
                  borderRadius: '4px',
                  backgroundColor: isEditingCentroids ? '#fffbe6' : '#f5f5f5'
                }}
              />
            </div>
          </Col>

          <Col span={24}>
            <Card size="small" title="操作说明">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>点击"生成随机点"按钮可以随机生成指定数量的数据点，也可以<strong>左键点击画布</strong>手动添加点</li>
                <li>设置K值后，在画布上<strong>左键点击</strong>设置K个质心点（使用明显区分的颜色）</li>
                <li>质心设置完成后，可继续<strong>左键点击</strong>添加更多数据点</li>
                <li><strong>右键点击</strong>画布可清空所有内容</li>
                <li>点击"执行一步"按钮逐步演示K-Means算法过程</li>
                <li><strong>聚类完成后</strong>，点击"修改质心"按钮可以调整质心位置，然后重新聚类</li>
                <li>可以导出当前数据到Excel，也可以从Excel文件导入数据</li>
                <li>当前迭代次数: <strong>{iteration}</strong></li>
                <li>当前状态: <strong>{isEditingCentroids ? '编辑质心中' : algorithmComplete ? '已完成' : isRunning ? '运行中' : '等待开始'}</strong></li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default KMeansDemo;
