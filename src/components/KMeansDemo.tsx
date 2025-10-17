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
  const [isRunningRound, setIsRunningRound] = useState<boolean>(false); // 是否正在运行一轮
  const [isRunningToEnd, setIsRunningToEnd] = useState<boolean>(false); // 是否正在运行到结束
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


  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const POINT_RADIUS = 5;

  // 绘制画布
  useEffect(() => {
    drawCanvas();
  }, [points, centroids, showPointCoordinates, showCentroidCoordinates, showLabels, distanceLines, assignedLines, processingPointIndex]);

  // 隐藏navbar和footer
  useEffect(() => {
    // 隐藏navbar - 使用多个选择器确保能找到
    const navbar = document.querySelector('nav') || 
                   document.querySelector('.navbar-header') || 
                   document.querySelector('header.ant-layout-header');
    if (navbar) {
      (navbar as HTMLElement).style.display = 'none';
    }
    
    // 隐藏footer
    const footer = document.querySelector('footer');
    if (footer) {
      (footer as HTMLElement).style.display = 'none';
    }

    // 组件卸载时恢复显示
    return () => {
      if (navbar) {
        (navbar as HTMLElement).style.display = '';
      }
      if (footer) {
        (footer as HTMLElement).style.display = '';
      }
    };
  }, []);

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

  // 鼠标按下：添加点或开始拖动
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRunning || isRunningRound || isRunningToEnd) return;

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

          }
        } else {

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

  };

  // 计算距离
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // 执行一步K-Means算法
  const executeStep = async (
    autoMode: boolean = false,
    currentProcessingIndex?: number,
    currentAssignedLines?: DistanceLine[]
  ): Promise<{ completed: boolean; newIndex: number; newAssignedLines: DistanceLine[] }> => {
    // 如果传入了当前状态，使用传入的值；否则使用state中的值
    const _processingPointIndex = currentProcessingIndex !== undefined ? currentProcessingIndex : processingPointIndex;
    const _assignedLines = currentAssignedLines !== undefined ? currentAssignedLines : assignedLines;
    
    console.log('\nexecuteStep 调用, autoMode:', autoMode);
    console.log('当前 processingPointIndex:', _processingPointIndex);
    console.log('当前 assignedLines.length:', _assignedLines.length);
    
    if (centroids.length !== k) {
      return { completed: false, newIndex: _processingPointIndex, newAssignedLines: _assignedLines };
    }

    if (points.length === 0) {
      return { completed: false, newIndex: _processingPointIndex, newAssignedLines: _assignedLines };
    }

    if (!autoMode) {
      setIsRunning(true);
    }

    // 阶段1: 为每个点分配最近的质心
    if (_processingPointIndex < points.length - 1) {
      const nextIndex = _processingPointIndex + 1;
      console.log('  -> 阶段1: 分配点到质心');
      console.log('  -> 即将处理点索引:', nextIndex);
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
      const newAssignedLines = [..._assignedLines, assignedLine];
      console.log('  -> 添加连线: 点', nextIndex, '-> 质心', closestCentroid);
      console.log('  -> 当前 assignedLines 数量:', newAssignedLines.length);
      setAssignedLines(newAssignedLines);
      
      // 非自动模式下，执行完一步后重置isRunning
      if (!autoMode) {
        setIsRunning(false);
      }
      return { completed: false, newIndex: nextIndex, newAssignedLines };

    } else if (_processingPointIndex === points.length - 1) {
      console.log('  -> 阶段2: 所有点处理完毕，检查聚类是否收敛');
      // 阶段2: 所有点处理完毕，检查聚类是否收敛
      
      // 创建当前轮次的分配关系映射
      const currentAssignments = new Map<number, number>();
      _assignedLines.forEach(line => {
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
        console.log('  -> 算法收敛！');
        setAlgorithmComplete(true);
        setIsRunning(false);
        setIsRunningRound(false);
        setIsRunningToEnd(false);
        // 算法完成,保持所有连线显示
        return { completed: true, newIndex: _processingPointIndex, newAssignedLines: _assignedLines }; // 返回true表示算法已完成
      } else {
        // 聚类簇发生变化,需要继续迭代
        console.log('  -> 聚类簇发生变化，需要继续迭代');
        
        const newCentroids = [...centroids];

        for (let i = 0; i < k; i++) {
          // 通过_assignedLines找到属于该簇的点
          const clusterPointIndices = _assignedLines
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
        console.log('  -> 重置状态: assignedLines清空, processingPointIndex重置为-1');
        setAssignedLines([]);
        setProcessingPointIndex(-1);
        setIteration(iteration + 1);
        setCurrentStep(0);
        
        // 非自动模式下，重置isRunning
        if (!autoMode) {
          setIsRunning(false);
        }
        return { completed: false, newIndex: -1, newAssignedLines: [] }; // 返回-1表示新一轮开始
      }
    }
    
    // 非自动模式下，重置isRunning
    if (!autoMode) {
      setIsRunning(false);
    }
    console.log('executeStep 结束，返回 processingPointIndex:', _processingPointIndex);
    return { completed: false, newIndex: _processingPointIndex, newAssignedLines: _assignedLines }; // 默认返回当前索引
  };

  // 运行一轮：将当前轮所有点都分配给最近的质心
  const runOneRound = async () => {
    if (centroids.length !== k) {
      return;
    }

    if (points.length === 0) {
      return;
    }

    setIsRunningRound(true);
    setIsRunning(true);

    console.log('=== runOneRound 开始 ===');
    console.log('初始状态: processingPointIndex =', processingPointIndex);
    console.log('初始状态: assignedLines.length =', assignedLines.length);
    console.log('初始状态: points.length =', points.length);

    try {
      let stepCount = 0;
      let currentProcessingIndex = processingPointIndex; // 本地追踪处理索引
      let currentAssignedLinesLocal = [...assignedLines]; // 本地追踪已分配连线
      const totalPoints = points.length;
      
      // 持续执行 executeStep 直到所有点都连上了质心
      while (currentAssignedLinesLocal.length < totalPoints) {
        stepCount++;
        console.log(`\n--- 第 ${stepCount} 次循环 ---`);
        console.log('循环前: currentProcessingIndex =', currentProcessingIndex);
        console.log('循环前: currentAssignedLinesLocal.length =', currentAssignedLinesLocal.length);
        console.log('循环前: totalPoints =', totalPoints);
        
        const result = await executeStep(true, currentProcessingIndex, currentAssignedLinesLocal);
        
        console.log('executeStep 返回结果:', result);
        
        if (result.completed) {
          // 算法已完成
          console.log('算法已完成，退出循环');
          return;
        }
        
        // 更新本地状态
        currentProcessingIndex = result.newIndex;
        currentAssignedLinesLocal = result.newAssignedLines;
        console.log('更新后: currentProcessingIndex =', currentProcessingIndex);
        console.log('更新后: currentAssignedLinesLocal.length =', currentAssignedLinesLocal.length);
        
        // 等待短时间再执行下一步
        await new Promise(resolve => setTimeout(resolve, 50 / speedMultiplier));
      }
      
      console.log('=== runOneRound 完成 ===');
    } finally {
      setIsRunningRound(false);
      setIsRunning(false);
    }
  };

  // 运行到结束：持续运行直到算法收敛
  const runToEnd = async () => {
    if (centroids.length !== k) {
      return;
    }

    if (points.length === 0) {
      return;
    }

    setIsRunningToEnd(true);
    setIsRunning(true);

    try {
      let maxIterations = 100; // 防止无限循环
      let iterCount = 0;

      while (iterCount < maxIterations && !algorithmComplete) {
        // 检查是否所有点都已分配
        if (processingPointIndex === points.length - 1 && assignedLines.length === points.length) {
          // 所有点已分配，执行一步来检查收敛和更新质心
          const result = await executeStep(true);
          if (result.completed) {
            // 算法已完成
            return;
          }
          // 重置处理索引，开始新轮次
          await new Promise(resolve => setTimeout(resolve, 500 / speedMultiplier));
        } else {
          // 还有未处理的点，继续分配
          const result = await executeStep(true);
          if (result.completed) {
            // 算法已完成
            return;
          }
          // 等待短时间再执行下一步
          await new Promise(resolve => setTimeout(resolve, 50 / speedMultiplier));
        }
        
        iterCount++;
      }
    } finally {
      setIsRunningToEnd(false);
      setIsRunning(false);
      if (!algorithmComplete) {

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

      } catch (error) {

      }
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  // 切换添加模式
  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'centroid' : 'point';
    setAddMode(newMode);
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

  };

  // 清除快照
  const clearSnapshot = () => {
    setSavedSnapshot(null);
    setSnapshotInfo('');

  };

  // 获取状态文本
  const getStatusText = () => {
    if (iteration === 0 && !isRunning && !algorithmComplete) {
      return '等待开始';
    }
    
    // 如果算法已完成（收敛），显示收敛信息
    if (algorithmComplete) {
      return `第${iteration + 1}轮迭代，已经收敛，迭代结束`;
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
    
    baseStatus += ` ${isRunning ? '运行中' : '等待继续'}`;
    return baseStatus;
  };



  return (
    <ConfigProvider>
      <div className="kmeans-demo-container" style={{ padding: '24px', backgroundColor: '#fff', minHeight: '100vh', margin: 0 }}>
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
                  disabled={isRunning || isRunningRound || isRunningToEnd}
                />
                <Button 
                  type="primary" 
                  onClick={generateRandomPoints}
                  disabled={isRunning || isRunningRound || isRunningToEnd}
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
                  disabled={isRunning || isRunningRound || isRunningToEnd}
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
                  disabled={isRunning || isRunningRound || isRunningToEnd}
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
                icon={<PlayCircleOutlined />}
                onClick={() => executeStep(false)}
                disabled={algorithmComplete || centroids.length !== k || isRunning}
              >
                执行一步
              </Button>

              <Button 
                type="primary" 
                onClick={runOneRound}
                disabled={algorithmComplete || centroids.length !== k || isRunning}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                🔄 运行一轮
              </Button>

              <Button 
                type="primary" 
                onClick={runToEnd}
                disabled={algorithmComplete || centroids.length !== k || isRunning}
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
              >
                ⚡ 运行到结束
              </Button>

              <Button 
                icon={<DownloadOutlined />}
                onClick={saveToExcel}
              >
                保存Excel
              </Button>

              <Button 
                onClick={saveSnapshot}
                style={{ backgroundColor: '#faad14', color: 'white', borderColor: '#faad14' }}
              >
                📸 保存快照
              </Button>

              {savedSnapshot && snapshotInfo && (
                <Space style={{ padding: '4px 12px', backgroundColor: '#f0f5ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                  <span style={{ fontSize: '12px', color: '#1890ff' }}>
                    📸 快照: {snapshotInfo}
                  </span>
                </Space>
              )}

              <Upload
                beforeUpload={handleFileUpload}
                accept=".xlsx,.xls"
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} disabled={isRunning || isRunningRound || isRunningToEnd}>
                  读Excel
                </Button>
              </Upload>

              <Space style={{ marginLeft: '16px', padding: '4px 12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                  {getStatusText()}
                </span>
              </Space>


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
                onContextMenu={(e) => {
                  if (!isRunning && !isRunningRound && !isRunningToEnd) {
                    handleCanvasRightClick(e);
                  } else {
                    e.preventDefault();
                  }
                }}
                style={{
                  border: '2px solid #d9d9d9',
                  cursor: isRunning || isRunningRound || isRunningToEnd
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
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={savedSnapshot} 
                  alt="Saved Snapshot" 
                  style={{ 
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    border: '2px solid #52c41a',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
              </div>
            </Col>
          )}

          <Col span={24}>
            <Card size="small" title="操作提示">
              <Row gutter={16}>
                <Col span={12}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>添加点</strong>：使用顶部的模式开关切换添加普通点或质心，点击画布添加</li>
                    <li><strong>拖动调整</strong>：点击并拖动任何点（普通点或质心）来调整位置</li>
                    <li><strong>执行算法</strong>：点击“执行一步”按钮逐步演示K-Means算法过程</li>
                  </ul>
                </Col>
                <Col span={12}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>右键清空</strong>：右键点击画布可清空所有内容</li>
                    <li><strong>保存对比</strong>：使用“📸 保存快照”按钮保存当前状态，方便对比调整前后的效果</li>
                  </ul>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default KMeansDemo;
