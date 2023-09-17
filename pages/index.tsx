/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'
import { Figtree } from 'next/font/google'
import axios from 'axios';
import { useState, useRef, useEffect } from "react";
const mimeType = "audio/webm";
import speechText from '@/pages/api/speechText';
import start from '@/assets/start.png'
import { useRouter } from 'next/router';

const figtree = Figtree({ subsets: ['latin'] })

enum emotions {
  start = 0,
  happyListen = 1,
  happyTalking = 2,
  angryListen = 3,
  angryTalking = 4,
  win = 5,
  lose = 6
}

enum GameState {
  home = 0,
  questionStart = 1,
  listening = 2,
  loading = 3,
  result = 4,
  endScreen = 5,
  errorScreen = 6,
}

export default function Home() {
  // ----------------Recording states--------------
  type MediaRecorderRefType = MediaRecorder | null;
  const mimeType = "audio/webm";
  const [permission, setPermission] = useState<boolean>(true);
  const mediaRecorder = useRef<MediaRecorderRefType>(null);
  const [recordingStatus, setRecordingStatus] = useState<string>("inactive");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audio, setAudio] = useState<string | ArrayBuffer | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const router = useRouter();

  //------------------Text states---------------
  const [avatarEmotions, setAvatarEmotions] = useState(emotions.start);
  const [gameState, setGameState] = useState<number>(GameState.home)
  const [title, setTitle] = useState<string>('Guess the Goose\'s deepest secrets');
  const [userResponse, setUserResponse] = useState<string>('Click to play');
  const [avatarResponse, setAvatarResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [blockedWords, setBlockedWords] = useState<string>('');
  const [showRules, setShowRules] = useState<string>('');
  const [avatar, setAvatar] = useState<number>();
  const [win, setWin] = useState<boolean | null>(null);
  const [userSpoke, setUserSpoke] = useState<string>('');
  const [cohereResponse, setCohereResponse] = useState<any>('');
  const [error, setError] = useState<boolean>(false);
  const [randomNum, setRandomNum] = useState<number>(Math.floor(Math.random() * (10 - 0 + 1)) + 0);
  const [bannedList, setBannedList] = useState<string[]>([]);
  const [resetGame, setResetGame] = useState<boolean>(false);
  const [duckImage, setDuckImage] = useState<string>("");

  const guessWords = [
    "Ranch", "Elephant", "Flower", "Giraffe", "Book",
    "Pizza", "Ocean", "Moon", "Fireworks", "Piano"
  ];

  const bannedWords = [
    ["farm", "white", "mild"],
    ["animal", "trunk", "safari"],
    ["blossom", "colour", "petal"],
    ["spots", "tall", "safari"],
    ["read", "author", "story"],
    ["cheese", "pepperoni", "slice"],
    ["sand", "midnight", "blue"],
    ["lunar", "outer", "fake"],
    ["colourful", "explosion", "ash"],
    ["keys", "concert", "hard"]
  ];

  const playCorrectDuckAudio = () => {
      const correctAudio = new Audio('audio/correct.mp3');
      correctAudio.play();
  }

  const playIncorrectDuckAudio = () => {
    const incorrectAudio = new Audio('audio/wrong.mp3');
    incorrectAudio.play();
  }

  //TODO:
  //!Better ui/ux
  //!Improve reset
  //*Add sound

  const incrementGameState = () => {
    if (gameState != 6) {
      setGameState(gameState + 1);
    }
  }

  const getMicrophonePermission = async (): Promise<void> => {
    if ("MediaRecorder" in window) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setPermission(true);
        setStream(mediaStream);
      } catch (err) {
        alert((err as Error).message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const startRecording = async (): Promise<void> => {
    setRecordingStatus("recording");
    console.log("started recording...")
    incrementGameState();
    if (stream) {
      const media = new MediaRecorder(stream, { mimeType });

      mediaRecorder.current = media;

      mediaRecorder.current.start();

      let localAudioChunks: Blob[] = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (typeof event.data === "undefined") return;
        if (event.data.size === 0) return;
        localAudioChunks.push(event.data);
      };

      setAudioChunks(localAudioChunks);
    }
  };

  const stopRecording = (): void => {
    setRecordingStatus("inactive");
    setLoading(true);
    incrementGameState();
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        var reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async function () {
          var base64data = reader.result;
          setAudio(audioUrl)

          try {
            const speechText = async (base64Audio: any) => {
              console.log("ran function")
              try {
                const response = await axios.post('/api/speechText', { audioFile: base64Audio });

                console.log('Speech-to-Text API response:', response.data);
                if (response.data.results && response.data?.results[0].alternatives) {
                  return response.data?.results[0].alternatives[0].transcript
                } else {
                  return "Oops, something went wrong."
                }
              } catch (error) {
                console.error('Error sending audio to API:', error);
                throw error;
              }
            };

            const textSpoken = await speechText(base64data);
            const contains1 = textSpoken.includes(bannedList[0]);
            const contains2 = textSpoken.includes(bannedList[1]);
            const contains3 = textSpoken.includes(bannedList[3]);

            if (contains1 || contains2 || contains3) {
              setError(true);
              console.log("Uh oh");
            }
            setUserSpoke(textSpoken);
          } catch (error) {
            console.error('Error sending audio to API:', error);
          }
        }
          
        setAudioChunks([]);
        setLoading(false);
      };
    }
  };

  const generateFromCohere = async (options: any) => {
    if (!cohereResponse) {
      try {
        axios
          .request(options)
          .then(function (response) {
            if (response.data?.generations.length > 0) {
              setCohereResponse(response.data?.generations[0].text)
            }
          })
          .catch(function (error) {
            setError(true);
            console.error(error);
          });
      } catch (error) {
        console.error('Error sending audio to API:', error);
        throw error;
      }
    }
  }

  const winCheck = () => {
    if (guessWords[randomNum].replace(/\s+/g, '').toLowerCase() === cohereResponse.replace(/\s+/g, '').toLowerCase()) {
      setWin(true);
    } else {
      setWin(false);
    }
  }

  useEffect(() => {
    if (error) {
      setGameState(6);
    }
    if (gameState === 0) {
      setRandomNum(Math.floor(Math.random() * (10 - 0 + 1)) + 0);
      setDuckImage('happy.png')
      setTitle('Greg The Goose');
      setUserResponse('Click to play');
      setAvatarResponse("");
    }
    if (gameState === 1) {  
      //Pick a random word
      setDuckImage('hapilyListening.png')
      setTitle(guessWords[randomNum])
      setBannedList(bannedWords[randomNum])
      setUserSpoke("");
      setUserResponse("Click to start speaking...")
    }
    if (gameState === 2) {
      setUserResponse("Click again to stop speaking...")
    }
    if (gameState === 3) {
      console.log("User said: ", userSpoke)
      setUserResponse("Thinking...")

      if (!loading) {
        setAvatarResponse("")
        setTimeout(() => {
          incrementGameState();
          setGameState(4)
        }, 2000); 
      } else {
        setAvatarResponse("Blank?")
        setUserResponse("Thinking...")
      }
    }
    if (gameState === 4) {
      setTitle("Is it...")
      setAvatarResponse("Hmmm...")
      setUserResponse(userSpoke + "?")
      setDuckImage("hapilyTalking.png")
      console.log("Checking...")

      const options: any = {
        method: 'POST',
        url: 'https://api.cohere.ai/v1/generate',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: 'Bearer o3kLQEasQecMgKmXam8oBy8M2kfTVRswxdVel7sY'
        },
        data: {
          max_tokens: 50,
          truncate: 'END',
          return_likelihoods: 'NONE',
          prompt: `Respond in exactly one word. What does the following describe best: \'${userSpoke}\'`
        }
      }

      if (userSpoke.length > 0) {
        generateFromCohere(options);
      } else {
        setGameState(6);
      }
      if (cohereResponse) {
        setAvatarResponse(cohereResponse)
        setUserResponse("Click to go next.");
      }
    } 
    if (gameState === 5) {
      winCheck()

      if (win) {
        playCorrectDuckAudio()
        setTitle("You win!")
        setAvatarResponse("")
        setUserResponse("Click to reset.")
        setCohereResponse("");
        setDuckImage("overjoyed.png") 
      } else {
        playIncorrectDuckAudio()
        setTitle("You lose.")
        setAvatarResponse("")
        setUserResponse("Click to reset.")
        setDuckImage("angry.png");
        setCohereResponse("");
      }
    }
    if (gameState === 6) {
      setTitle('Oops, something went wrong.');
      setUserResponse('Click to try again');
      setAvatarResponse("Don't cheat.");
      setDuckImage('angry.png');
      setCohereResponse("");
    }
  }, [gameState, avatarResponse, loading, userSpoke, cohereResponse, error, resetGame])

  return (
    <div className={`w-full h-screen  flex flex-col py-[60px] items-center justify-center relative bg-opacity-10 ${figtree.className}
    ${gameState === 1 && 'bg-green-200'} ${gameState === 6 && 'bg-red-400'}`}>
      {userResponse === 'Click to play' && gameState === 0 && (
        <div onClick={() => {
          getMicrophonePermission();
          incrementGameState()
        }} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50' /> 
      )}
      {gameState === 1 && (
        <div onClick={() => {
          startRecording()
        }} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50' /> 
      )}
      {gameState === 2 && (
        <div onClick={() => {
          stopRecording()
        }} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50 bg-red-200 bg-opacity-10' />
      )}
      {gameState === 3 && (
        <div onClick={() => incrementGameState()} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50 bg-blue-200 bg-opacity-10' />
      )}
      {gameState === 4 && (
        <div onClick={() => incrementGameState()} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50 bg-purple-200 bg-opacity-10' />
      )}
      {gameState === 5   && (
        <div onClick={() => { setResetGame(true); setGameState(0)}} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50'></div>
      )}
      {gameState === 6 && (
        <div onClick={() => { setResetGame(true); setGameState(0) }} className='absolute h-full w-full top-0 left-0 cursor-pointer z-50'></div>
      )}
      <div className='w-full text-center text-[45px] font-extrabold h-fit mb-32'>{title}</div>
      <div className='relative mx-auto w-full flex items-center justify-center h-full'>
        <div className='h-[300px] w-[300px] border-[5px] border-black rounded-full relative'>
          <Image
            src={`/ducks/${duckImage}`}
            height={300}
            width={300}
            alt='Duck'
          />
          {avatarResponse === `Don\'t cheat.` ? (
            <div className="absolute -left-60 top-0 bottom-0 translate-y-1/2">
              <span className="text-[35px] font-extrabold">{avatarResponse}</span>
            </div>
          ) : (
              <div className="absolute -left-44 top-0 bottom-0 translate-y-1/2">
                <span className="text-[35px] font-extrabold">{avatarResponse}</span>
              </div>
          )}
          {gameState === 1 && bannedList?.length && (
            <div className='absolute -right-48 z-50 top-0 bottom-0 h-fit translate-y-[35%]'>
              <div className="flex flex-col gap-2 justify-center">
                <div className="h-fit text-2xl font-bold text-center mb-1">Cannot say:</div>
                <div className='flex flex-col gap-4 font-semibold text-xl items-center justify-center
                capitalize p-2 px-4 border rounded-xl h-fit'>
                  {bannedList.map((word, index) => (
                    <div key={index}>
                      {word}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className='w-full text-center text-[32px] font-extrabold h-full flex items-center justify-center'>
        <span>{userResponse}</span>
      </div>


      {/* <h2>Audio Recorder</h2>
      <main>
        <div className="audio-controls">
          {!permission ? (
            <button onClick={getMicrophonePermission} type="button">
              Get Microphone
            </button>
          ) : null}
          {permission && recordingStatus === "inactive" ? (
            <button onClick={startRecording} type="button">
              Start Recording
            </button>
          ) : null}
          {recordingStatus === "recording" ? (
            <button onClick={stopRecording} type="button">
              Stop Recording
            </button>
          ) : null}
          {audio ? (
            <div className="audio-player">
              <audio controls>
                {typeof audio === 'string' ? (
                  <source src={audio} type="audio/mpeg" />
                ) : null}
              </audio>
              {typeof audio === 'string' ? (
                <a download href={audio}>
                  Download Recording
                </a>
              ) : null}
            </div>
          ) : null}
          {audio && (
            <div onClick={() => setAudio(null)} className="p-2 rounded-md">
              Reset
            </div>
          )}
        </div>
      </main> */}
    </div>
  )
}
