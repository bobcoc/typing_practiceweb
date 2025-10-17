import React, { useRef, useEffect, useState } from 'react';
import { Button, InputNumber, Checkbox, Upload, message, Space, Card, Row, Col, ConfigProvider, Switch, Slider } from 'antd';
import { DownloadOutlined, UploadOutlined, ClearOutlined, PlayCircleOutlined, PauseOutlined, AimOutlined, DotChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  const [showPointCoordinates, setShowPointCoordinates] = useState<boolean>(false);
  const [showCentroidCoordinates, setShowCentroidCoordinates] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [distanceLines, setDistanceLines] = useState<DistanceLine[]>([]); // 当前正在显示的临时距离线
  const [assignedLines, setAssignedLines] = useState<DistanceLine[]>([]); // 已分配的永久连线
  const [processingPointIndex, setProcessingPointIndex] = useState<number>(-1);
  const [algorithmComplete, setAlgorithmComplete] = useState<boolean>(false);
  const [iteration, setIteration] = useState<number>(0);
  const [addMode, setAddMode] = useState<'point' | 'centroid'>('point'); // 添加模式：普通点或质心
  const [draggingPointIndex, setDraggingPointIndex] = useState<number>(-1); // 正在拖动的普通点索引
  const [draggingCentroidIndex, setDraggingCentroidIndex] = useState<number>(-1); // 正在拖动的质心索引
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null); // 保存的画布快照
  const [snapshotInfo, setSnapshotInfo] = useState<string>(''); // 快照信息
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 动画速度倍数
  const [previousAssignments, setPreviousAssignments] = useState<Map<number, number>>(new Map()); // 上一轮的点到质心分配关系
  const [messageText, setMessageText] = useState<string>('准备就绪'); // 消息报告区文本
  const [messageType, setMessageType] = useState<'info' | 'success' | 'warning' | 'error'>('info'); // 消息类型

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const POINT_RADIUS = 5;

  // 绘制画布
  useEffect(() => {
    drawCanvas();
  }, [points, centroids, showPointCoordinates, showCentroidCoordinates, showLabels, distanceLines, assignedLines, processingPointIndex]);

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

      // 显示点的坐标
      if (showPointCoordinates) {
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

      // 显示质心坐标
      if (showCentroidCoordinates) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(`(${Math.round(centroid.x)}, ${Math.round(centroid.y)})`, centroid.x + 12, centroid.y + 20);
      }
    });
  };

  // 显示消息(不弹出,仅在消息区显示)
  const showMessage = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setMessageText(text);
    setMessageType(type);
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
    showMessage('已生成随机点', 'success');
  };

  // 鼠标按下：添加点或开始拖动
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRunning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) { // 左键
      // 检查是否点击了某个质心附近（15像素范围内）
      const clickedCentroidIndex = centroids.findIndex(c => {
        const distance = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
        return distance < 15;
      });

      if (clickedCentroidIndex >= 0) {
        // 开始拖动质心
        setDraggingCentroidIndex(clickedCentroidIndex);
        return;
      }

      // 检查是否点击了某个普通点附近（10像素范围内）
      const clickedPointIndex = points.findIndex(p => {
        const distance = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        return distance < 10;
      });

      if (clickedPointIndex >= 0) {
        // 开始拖动普通点
        setDraggingPointIndex(clickedPointIndex);
        return;
      }

      // 没有点击到任何点，根据当前模式添加新点
      if (addMode === 'centroid') {
        if (centroids.length < k) {
          // 添加质心
          setCentroids([...centroids, {
            x,
            y,
            color: COLORS[centroids.length % COLORS.length]
          }]);
          
          // 如果质心已满，自动切换到普通点模式
          if (centroids.length + 1 >= k) {
            setAddMode('point');
            showMessage(`已添加 ${k} 个质心，自动切换到添加普通点模式`, 'success');
          }
        } else {
          showMessage(`已达到最大质心数量 ${k}，请切换到普通点模式`, 'warning');
        }
      } else {
        // 添加普通点
        setPoints([...points, { x, y }]);
      }
    }
  };

  // 鼠标移动时拖动点或质心
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 拖动质心
    if (draggingCentroidIndex >= 0) {
      const newCentroids = [...centroids];
      newCentroids[draggingCentroidIndex] = {
        ...newCentroids[draggingCentroidIndex],
        x,
        y
      };
      setCentroids(newCentroids);
    }

    // 拖动普通点
    if (draggingPointIndex >= 0) {
      const newPoints = [...points];
      newPoints[draggingPointIndex] = {
        ...newPoints[draggingPointIndex],
        x,
        y
      };
      setPoints(newPoints);
    }
  };

  // 鼠标释放时停止拖动
  const handleCanvasMouseUp = () => {
    if (draggingCentroidIndex >= 0) {
      showMessage(`质心C${draggingCentroidIndex + 1}已移动到新位置`, 'success');
      setDraggingCentroidIndex(-1);
      // 清空已分配的连线,点会自动变回灰色
      setAssignedLines([]);
      setProcessingPointIndex(-1);
      setAlgorithmComplete(false);
      setIteration(0);
    }
    if (draggingPointIndex >= 0) {
      setDraggingPointIndex(-1);
      // 清空已分配的连线,点会自动变回灰色
      setAssignedLines([]);
      setProcessingPointIndex(-1);
      setAlgorithmComplete(false);
      setIteration(0);
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
    setDraggingPointIndex(-1); // 停止拖动普通点
    setDraggingCentroidIndex(-1); // 停止拖动质心
    setPreviousAssignments(new Map()); // 清空历史分配记录
    showMessage('准备就绪', 'info');
  };

  // 计算距离
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // 执行一步K-Means算法
  const executeStep = async () => {
    if (centroids.length !== k) {
      showMessage(`请先设置 ${k} 个质心点！`, 'warning');
      return;
    }

    if (points.length === 0) {
      showMessage('请先添加数据点！', 'warning');
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

      // 逐条显示距离线（根据倍速调整延迟）
      for (let i = 0; i < distances.length; i++) {
        setDistanceLines(distances.slice(0, i + 1));
        await new Promise(resolve => setTimeout(resolve, 800 / speedMultiplier)); // 根据倍速调整
      }

      // 找到最短距离
      const minDistance = Math.min(...distances.map(d => d.distance));
      const closestCentroid = distances.findIndex(d => d.distance === minDistance);

      // 高亮最短的线
      setDistanceLines([distances[closestCentroid]]);
      await new Promise(resolve => setTimeout(resolve, 1000 / speedMultiplier)); // 根据倍速调整

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
      // 阶段2: 所有点处理完毕，检查聚类是否收敛
      
      // 创建当前轮次的分配关系映射
      const currentAssignments = new Map<number, number>();
      assignedLines.forEach(line => {
        currentAssignments.set(line.pointIndex, line.centroidIndex);
      });
      
      // 比较当前分配和上一轮分配是否完全相同
      let assignmentsChanged = false;
      
      if (previousAssignments.size === 0) {
        // 第一轮迭代，肯定需要继续
        assignmentsChanged = true;
      } else if (previousAssignments.size !== currentAssignments.size) {
        // 分配的点数不同（不应该发生，但以防万一）
        assignmentsChanged = true;
      } else {
        // 检查每个点的分配是否改变
        for (let i = 0; i < points.length; i++) {
          const prevCluster = previousAssignments.get(i);
          const currCluster = currentAssignments.get(i);
          if (prevCluster !== currCluster) {
            assignmentsChanged = true;
            break;
          }
        }
      }
      
      if (!assignmentsChanged) {
        // 聚类簇没有变化,算法收敛
        showMessage(`K-Means算法收敛!经过 ${iteration + 1} 次迭代后聚类完成`, 'success');
        setAlgorithmComplete(true);
        setIsRunning(false);
        // 算法完成,保持所有连线显示
      } else {
        // 聚类簇发生变化,需要继续迭代
        showMessage(`第 ${iteration + 1} 次迭代:重新计算质心...`, 'info');
        
        const newCentroids = [...centroids];

        for (let i = 0; i < k; i++) {
          // 通过assignedLines找到属于该簇的点
          const clusterPointIndices = assignedLines
            .filter(line => line.centroidIndex === i)
            .map(line => line.pointIndex);
          const clusterPoints = clusterPointIndices.map(idx => points[idx]);
          
          if (clusterPoints.length > 0) {
            const newX = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
            const newY = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
            
            newCentroids[i] = {
              ...newCentroids[i],
              x: newX,
              y: newY
            };
          }
        }

        setCentroids(newCentroids);
        
        // 保存当前分配关系供下一轮比较
        setPreviousAssignments(new Map(currentAssignments));
        
        // 继续下一轮迭代
        // 清空已分配的连线(点会自动变回灰色,因为没有连线了)
        setAssignedLines([]);
        setProcessingPointIndex(-1);
        setIteration(iteration + 1);
        setCurrentStep(0);
        showMessage('质心已更新,所有点重置为灰色,开始新一轮迭代...', 'info');
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
    showMessage('数据已导出到Excel文件', 'success');
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
        showMessage('数据已从Excel文件导入', 'success');
      } catch (error) {
        showMessage('文件读取失败,请确保格式正确', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  // 切换添加模式
  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'centroid' : 'point';
    setAddMode(newMode);
    if (newMode === 'centroid' && centroids.length >= k) {
      showMessage(`已达到最大质心数量 ${k},请先删除或调整K值`, 'warning');
    } else {
      showMessage(checked ? '切换到添加质心模式' : '切换到添加普通点模式', 'info');
    }
  };

  // 倍速滑动条的标记（均匀分布）
  const speedMarks = {
    0: '1x',
    1: '2x',
    2: '4x',
    3: '8x',
    4: '16x'
  };

  // 倍速值映射（索引到实际倍数）
  const speedValues = [1, 2, 4, 8, 16];

  // 处理倍速变化
  const handleSpeedChange = (index: number) => {
    setSpeedMultiplier(speedValues[index]);
  };

  // 保存当前画布快照
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    setSavedSnapshot(dataUrl);
    const info = algorithmComplete 
      ? `收敛完成(迭代${iteration}次)`
      : `进行中(迭代${iteration}次,处理点${processingPointIndex + 1}/${points.length})`;
    setSnapshotInfo(info);
    showMessage('画布快照已保存!', 'success');
  };

  // 清除快照
  const clearSnapshot = () => {
    setSavedSnapshot(null);
    setSnapshotInfo('');
    showMessage('快照已清除', 'info');
  };

  // 获取状态文本
  const getStatusText = () => {
    if (iteration === 0 && !isRunning && !algorithmComplete) {
      return '等待开始';
    }
    
    let baseStatus = `第${iteration + 1}轮迭代`;
    
    // 如果正在处理点，添加详细进度
    if (processingPointIndex >= 0 && processingPointIndex < points.length) {
      if (showLabels) {
        // 显示字母标签模式：显示当前处理的点字母
        const pointLabel = String.fromCharCode(65 + processingPointIndex); // A=65, B=66, ...
        baseStatus += ` - 正在处理点${pointLabel}`;
      } else {
        // 不显示字母标签模式：显示数字进度
        baseStatus += ` - 处理点${processingPointIndex + 1}/${points.length}`;
      }
    }
    
    baseStatus += ` ${algorithmComplete ? '已完成' : isRunning ? '运行中' : '等待继续'}`;
    return baseStatus;
  };

  // 获取消息样式
  const getMessageStyle = () => {
    const baseStyle = {
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 500 as const
    };
    
    switch (messageType) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#f6ffed', color: '#52c41a', border: '1px solid #b7eb8f' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#fffbe6', color: '#faad14', border: '1px solid #ffe58f' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#fff2f0', color: '#ff4d4f', border: '1px solid #ffccc7' };
      default:
        return { ...baseStyle, backgroundColor: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff' };
    }
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
                checked={showPointCoordinates} 
                onChange={(e) => setShowPointCoordinates(e.target.checked)}
              >
                显示点坐标
              </Checkbox>

              <Checkbox 
                checked={showCentroidCoordinates} 
                onChange={(e) => setShowCentroidCoordinates(e.target.checked)}
              >
                显示质心坐标
              </Checkbox>

              <Checkbox 
                checked={showLabels} 
                onChange={(e) => setShowLabels(e.target.checked)}
              >
                显示标签(A,B,C...)
              </Checkbox>

              <Space>
                <span>添加模式:</span>
                <Switch
                  checkedChildren={<><AimOutlined /> 质心</>}
                  unCheckedChildren={<><DotChartOutlined /> 普通点</>}
                  checked={addMode === 'centroid'}
                  onChange={handleModeChange}
                  disabled={isRunning}
                />
                {addMode === 'centroid' && (
                  <span style={{ color: '#1890ff', fontSize: '12px' }}>
                    ({centroids.length}/{k})
                  </span>
                )}
              </Space>

              <Space style={{ minWidth: '200px' }}>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <span>动画倍速:</span>
                <Slider
                  min={0}
                  max={4}
                  marks={speedMarks}
                  step={1}
                  value={speedValues.indexOf(speedMultiplier)}
                  onChange={handleSpeedChange}
                  style={{ width: '150px' }}
                  tooltip={{ formatter: (index) => `${speedValues[index || 0]}x` }}
                />
              </Space>

              <Button 
                type="primary" 
                icon={isRunning ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={executeStep}
                disabled={algorithmComplete || centroids.length !== k}
              >
                执行一步
              </Button>

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
                保存Excel
              </Button>

              <Button 
                type="default"
                onClick={saveSnapshot}
                style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
              >
                📸 保存快照
              </Button>

              {savedSnapshot && (
                <Button 
                  danger
                  onClick={clearSnapshot}
                >
                  清除快照
                </Button>
              )}

              <Upload
                beforeUpload={handleFileUpload}
                accept=".xlsx,.xls"
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} disabled={isRunning}>
                  读Excel
                </Button>
              </Upload>

              <Space style={{ marginLeft: '16px', padding: '4px 12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                  {getStatusText()}
                </span>
              </Space>

              <div style={getMessageStyle()}>
                📢 {messageText}
              </div>
            </Space>
          </Col>

          <Col span={savedSnapshot ? 12 : 24}>
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
                  cursor: isRunning 
                    ? 'not-allowed' 
                    : (draggingCentroidIndex >= 0 || draggingPointIndex >= 0) 
                      ? 'grabbing' 
                      : 'crosshair',
                  borderRadius: '4px',
                  backgroundColor: addMode === 'centroid' ? '#e6f7ff' : '#f5f5f5'
                }}
              />
            </div>
          </Col>

          {savedSnapshot && (
            <Col span={12}>
              <Card 
                size="small" 
                title="已保存的快照" 
                extra={<span style={{ fontSize: '12px', color: '#666' }}>{snapshotInfo}</span>}
                style={{ height: '100%' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <img 
                    src={savedSnapshot} 
                    alt="Saved Snapshot" 
                    style={{ 
                      maxWidth: '100%', 
                      border: '2px solid #52c41a',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }} 
                  />
                </div>
              </Card>
            </Col>
          )}

          <Col span={24}>
            <Card size="small" title="操作提示">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>添加点</strong>：使用顶部的模式开关切换添加普通点或质心，点击画布添加</li>
                <li><strong>拖动调整</strong>：点击并拖动任何点（普通点或质心）来调整位置</li>
                <li><strong>执行算法</strong>：点击"执行一步"按钮逐步演示K-Means算法过程</li>
                <li><strong>右键清空</strong>：右键点击画布可清空所有内容</li>
                <li><strong>保存对比</strong>：使用"📸 保存快照"按钮保存当前状态，方便对比调整前后的效果</li>
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
