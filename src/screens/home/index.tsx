import { ColorSwatch, Group, Slider } from '@mantine/core'; // Import Slider
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { IconBrush } from '@tabler/icons-react'; // Import slider icon

const SWATCHES = [
    "#ffffff", // white
    "#ee3333", // red
    "#e64980", // pink
    "#be4bdb", // purple
    "#893200", // brown
    "#228be6", // blue
    "#3333ee", // dark blue
    "#40c057", // green
    "#00aa00", // dark green
    "#fab005", // yellow,
    "#fd7e14"  // orange
];

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [brushSize, setBrushSize] = useState(10); // New state for brush size
    const [isErasing, setIsErasing] = useState(false); // New state to toggle erase functionality

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = brushSize; // Set line width to brush size
            }
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };

    }, [brushSize]); // Re-run effect if brushSize changes

    const renderLatexToCanvas = (expression: string, answer: string) => {
        setLatexExpression([...latexExpression, `${expression} = ${answer}`]);

        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = isErasing ? 'black' : color; // Set to black for erasing
                ctx.lineWidth = brushSize; // Set line width to brush size
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const runRoute = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars
                }
            });

            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    });
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({ x: centerX, y: centerY });
            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

    return (
        <div style={{ backgroundColor: '#282c34', minHeight: '100vh', padding: '20px', color: '#ffffff' }}>
            <div className='flex flex-col sm:grid sm:grid-cols-3 gap-2'>
                <div className='z-20 h-[41px] bg-gray-800 text-xl font-semibold rounded text-white hover:bg-gray-900 transition duration-300 text-center'>MathPad.AI - <span className='mt-5 text-xs'>[ Created By Aditya Modanwal  . ]</span></div>
                <Button
                    onClick={() => setReset(true)}
                    className='z-20 bg-red-600 text-white text-xl font-semibold rounded hover:bg-red-700 transition duration-300 mb-2 sm:mb-0'
                    variant='default' // Use Mantine's filled variant
                >
                    Reset
                </Button>
                <div className='z-50 bg-gray-400 p-2 rounded'>
                    <h2 className='text-xl font-semibold text-blue-700 mb-3'>Select Your Favourite Color</h2>
                <Group className='z-20 mb-2 sm:mb-0'>
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch key={swatch} color={swatch} onClick={() => setColor(swatch)} />
                    ))}
                </Group>
                </div>
                <Button
                    onClick={runRoute}
                    className='z-20 bg-yellow-600 text-xl font-semibold rounded text-white hover:bg-yellow-700 transition duration-300 mb-2 sm:mb-0'
                    variant='default'
                >
                    Run
                </Button>
                <Button
                    onClick={() => setIsErasing(!isErasing)} // Toggle erasing
                    className='z-20 bg-blue-600 text-white text-xl font-semibold rounded hover:bg-blue-700 transition duration-300 mb-2 sm:mb-0'
                    variant='default'

                >
                    {isErasing ? 'Drawing' : 'Erasing'} {/* Toggle text */}
                </Button>
            </div>
            
            {/* Brush Size Control */}
            <div className=" mt-6 w-[300px] flex items-center justify-center mb-4 gap-4">
                <IconBrush size={50} color="#007bff" className="z-50 mr-2" /> {/* Slider icon */}
                <Slider
                    value={brushSize}
                    onChange={setBrushSize}
                    min={5}
                    max={30}
                    step={1}
                    styles={{
                        track: { backgroundColor: '#007bff', height: '18px' },
                        bar: { backgroundColor: '#0056b3' },
                        thumb: { backgroundColor: '#ffffff', border: '2px solid #007bff', height: '20px', width: '20px' },
                    }}
                    className=" mx-auto w-80 z-50 bg-white h-8 justify-center p-5 rounded" // Set a fixed width
                />
                <span className="ml-2">{brushSize}px</span> {/* Display brush size */}
            </div>

            <canvas
                ref={canvasRef}
                id='canvas'
                className='absolute top-0 left-0 w-full h-full border border-blue-500' // Added border for canvas
                style={{ backgroundColor: '#1e1e1e' }} // Set canvas background color
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
        </div>
    );
}
