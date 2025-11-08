import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Turn, Role, WeatherData } from '../types';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audio';

const SYSTEM_INSTRUCTION = "You are Agribot, a friendly and knowledgeable AI assistant for farmers. Provide concise, actionable advice on crop management, pest control, and soil health. Use simple language. Keep your answers brief. When asked for the weather, use the `getWeatherForecast` function.";

const getWeatherForecastDeclaration: FunctionDeclaration = {
  name: 'getWeatherForecast',
  parameters: {
    type: Type.OBJECT,
    description: 'Get the weather forecast for a given location.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'The location to get the weather for. e.g. "San Francisco". If not provided, will use the user\'s current location.',
      },
    },
    required: [],
  },
};

const mockGetWeatherForecast = async (location?: string): Promise<WeatherData> => {
    console.log(`Getting weather for ${location || 'current location'}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
        location: location || 'Your Location',
        temperature: '22°C',
        condition: 'sunny',
        forecast: [
            { day: 'Tomorrow', temperature: '24°C', condition: 'sunny' },
            { day: 'In 2 days', temperature: '21°C', condition: 'cloudy' },
            { day: 'In 3 days', temperature: '19°C', condition: 'rainy' },
        ],
    };
};


export const useAgribot = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopConversation = useCallback(() => {
    console.log("Stopping conversation...");
    setConnectionState(ConnectionState.IDLE);

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    setConversation(prev => {
        if (prev.length === 0) return prev;
        const lastTurn = prev[prev.length - 1];
        if (lastTurn && !lastTurn.isFinal) {
            return [...prev.slice(0, -1), { ...lastTurn, isFinal: true }];
        }
        return prev;
    });

  }, []);


  const startConversation = useCallback(async () => {
    setError(null);
    setConversation([]);
    setConnectionState(ConnectionState.CONNECTING);
    
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            locationRef.current = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            console.log('Location set:', locationRef.current);
        }, (err) => {
            console.error("Error getting location:", err);
            setError("Could not get location. Weather forecast may be unavailable.");
        });
    }

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Fix: Cast window to `any` to access vendor-prefixed `webkitAudioContext` without TypeScript errors.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Fix: Cast window to `any` to access vendor-prefixed `webkitAudioContext` without TypeScript errors.
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [getWeatherForecastDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            console.log("Session opened.");
            setConnectionState(ConnectionState.CONNECTED);
            
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'getWeatherForecast') {
                        const weatherData = await mockGetWeatherForecast(fc.args.location as string | undefined);
                        
                        setConversation(prev => {
                            const last = prev[prev.length - 1];
                            let newTurns = [...prev];
                            if (last?.role === Role.USER && !last.isFinal) {
                                newTurns = [...prev.slice(0, -1), { ...last, isFinal: true }];
                                currentInputTranscriptionRef.current = '';
                            }
                            newTurns.push({ role: Role.MODEL, weather: weatherData, isFinal: true });
                            return newTurns;
                        });

                        sessionPromiseRef.current?.then((session) => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id : fc.id,
                                    name: fc.name,
                                    response: { result: JSON.stringify(weatherData) },
                                }
                            });
                        });
                    }
                }
            } else if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptionRef.current += text;
                setConversation(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === Role.USER && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                    }
                    return [...prev, { role: Role.USER, text: currentInputTranscriptionRef.current, isFinal: false }];
                });
            } else if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                 setConversation(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === Role.USER && !last.isFinal) {
                        const finalUserTurn = { ...last, text: currentInputTranscriptionRef.current, isFinal: true };
                        currentInputTranscriptionRef.current = '';
                        return [...prev.slice(0, -1), finalUserTurn, { role: Role.MODEL, text: currentOutputTranscriptionRef.current, isFinal: false }];
                    }
                    if (last?.role === Role.MODEL && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                    }
                    // This handles the case where a weather card was just added
                    if (last?.role === Role.MODEL && last.weather) {
                        return [...prev, { role: Role.MODEL, text: currentOutputTranscriptionRef.current, isFinal: false }];
                    }
                    return [...prev, { role: Role.MODEL, text: currentOutputTranscriptionRef.current, isFinal: false }];
                });
            }

            if (message.serverContent?.turnComplete) {
                setConversation(prev => {
                    const last = prev[prev.length-1];
                    if (last?.role === Role.MODEL && !last.isFinal) {
                        const finalModelTurn = { ...last, text: currentOutputTranscriptionRef.current, isFinal: true };
                        currentOutputTranscriptionRef.current = '';
                        return [...prev.slice(0, -1), finalModelTurn];
                    }
                    return prev;
                });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio && outputAudioContextRef.current) {
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);

                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setError(`Connection error: ${e.message}`);
            setConnectionState(ConnectionState.ERROR);
            stopConversation();
          },
          onclose: (e: CloseEvent) => {
            console.log("Session closed.");
            setConnectionState(ConnectionState.DISCONNECTED);
            // Call stopConversation to ensure cleanup, but avoid setting state if already idle
            if (connectionState !== ConnectionState.IDLE) {
                stopConversation();
            }
          },
        }
      });

    } catch (e: any) {
      console.error("Failed to start conversation:", e);
      setError(`Error: ${e.message}`);
      setConnectionState(ConnectionState.ERROR);
      stopConversation();
    }
  }, [stopConversation, connectionState]);
  
  return {
    connectionState,
    conversation,
    error,
    startConversation,
    stopConversation,
  };
};