
import React, { useState, useEffect } from 'react';
import { PlayerData, GameStatus, Guess } from './types';
import { fetchRandomPlayerData, fetchSpecificPlayerStats } from './services/geminiService';
import PRChart from './components/PRChart';
import FieldChart from './components/FieldChart';
import DistributionChart from './components/DistributionChart';

const MAX_ATTEMPTS = 5;

const App: React.FC = () => {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.LOADING);
  const [inputName, setInputName] = useState('');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [showTeam, setShowTeam] = useState(false);
  const [showAdvancedChart, setShowAdvancedChart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);

  // Initialize Game
  const initGame = async () => {
    setStatus(GameStatus.LOADING);
    setGuesses([]);
    setShowTeam(false);
    setShowAdvancedChart(false);
    setErrorMsg(null);
    setInputName('');
    setPlayerData(null);
    setIsGuessing(false);
    
    try {
      const data = await fetchRandomPlayerData();
      setPlayerData(data);
      setStatus(GameStatus.PLAYING);
    } catch (e) {
      console.error(e);
      setErrorMsg("無法從 野球革命 獲取數據。請檢查網路或稍後再試。");
      setStatus(GameStatus.ERROR);
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerData || status !== GameStatus.PLAYING || !inputName.trim() || isGuessing) return;

    const rawInput = inputName.trim();
    
    // Feature 2: Cheat Code "解答"
    if (rawInput === "解答") {
        setStatus(GameStatus.LOST);
        setShowTeam(true);
        setShowAdvancedChart(true);
        setInputName('');
        return;
    }

    // Normalizing input (remove spaces)
    const normalizedInput = rawInput.replace(/\s/g, '');
    const isCorrect = normalizedInput === playerData.name.replace(/\s/g, '');

    if (isCorrect) {
      // Correct Guess
      const newGuesses = [...guesses, { name: rawInput, isCorrect: true }];
      setGuesses(newGuesses);
      setStatus(GameStatus.WON);
      setShowTeam(true);
      setShowAdvancedChart(true);
      setInputName('');
    } else {
      // Wrong Guess - Add to list but DO NOT fetch stats immediately (lazy load)
      // This solves the issue of the chart "not appearing" if the immediate fetch fails silently or layout shifts too fast.
      // User must explicitly click to compare.
      const guessData: Guess = { name: rawInput, isCorrect: false };
      
      const newGuesses = [...guesses, guessData];
      setGuesses(newGuesses);
      setInputName('');

      // Check Game Over conditions
      if (newGuesses.length >= MAX_ATTEMPTS) {
        setStatus(GameStatus.LOST);
        setShowTeam(true);
        setShowAdvancedChart(true);
      } else {
        // Unlock clues
        if (newGuesses.length >= 1) setShowTeam(true);
        if (newGuesses.length >= 3) setShowAdvancedChart(true);
      }
    }
  };

  const handleCompare = async (realIndex: number) => {
    // Prevent multiple fetches
    if (guesses[realIndex].data || guesses[realIndex].error || guesses[realIndex].isLoading) return;

    // Set loading state for specific guess
    setGuesses(prev => {
        const next = [...prev];
        next[realIndex] = { ...next[realIndex], isLoading: true };
        return next;
    });

    try {
        const guess = guesses[realIndex];
        const result = await fetchSpecificPlayerStats(guess.name, playerData!.year);
        
        setGuesses(prev => {
            const next = [...prev];
            if ('error' in result) {
                next[realIndex] = { ...next[realIndex], isLoading: false, error: result.error };
            } else {
                next[realIndex] = { ...next[realIndex], isLoading: false, data: result };
            }
            return next;
        });
    } catch (e) {
        setGuesses(prev => {
            const next = [...prev];
            next[realIndex] = { ...next[realIndex], isLoading: false, error: "驗證失敗" };
            return next;
        });
    }
  };

  if (status === GameStatus.LOADING) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rebas-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-rebas-blue"></div>
        <p className="mt-4 text-rebas-blue font-bold">正在從 野球革命 (Rebas.tw) 隨機搜尋球員數據...</p>
      </div>
    );
  }

  if (status === GameStatus.ERROR) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
            <h1 className="text-xl font-bold text-red-600 mb-4">發生錯誤</h1>
            <p className="text-gray-700 mb-6">{errorMsg}</p>
            <button onClick={initGame} className="px-6 py-2 bg-rebas-blue text-white rounded hover:bg-blue-800 transition-colors">
                重試
            </button>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-rebas-bg pb-24 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-rebas-blue tracking-tight">
             Guess The Player
             <span className="text-xs ml-2 font-normal text-gray-500 border border-gray-300 rounded px-1">
                {playerData?.year}
             </span>
          </h1>
          <button 
            onClick={initGame} 
            className="text-sm text-gray-600 hover:text-rebas-blue underline"
          >
            新遊戲
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        
        {/* Game Status Messages */}
        {status === GameStatus.WON && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                <strong className="font-bold">恭喜！</strong>
                <span className="block sm:inline"> 答案是 {playerData?.name} ({playerData?.team})。</span>
            </div>
        )}
        {status === GameStatus.LOST && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">遊戲結束。</strong>
                <span className="block sm:inline"> 答案是 {playerData?.name} ({playerData?.team})。</span>
            </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* 1. Target Player PR Chart (Always Visible) */}
             <div className="md:col-span-2">
                 {playerData && <PRChart stats={playerData.stats} type={playerData.type} />}
             </div>

             {/* 2. Team Hint (After 1 wrong or if solved) */}
             {showTeam && (
                 <div className="bg-white p-4 rounded-lg shadow-sm border border-rebas-blue border-l-4 animate-fade-in">
                     <p className="text-sm text-gray-500 font-bold uppercase">Clue 1: Team</p>
                     <p className="text-2xl font-bold text-rebas-blue mt-1">{playerData?.team}</p>
                 </div>
             )}

             {/* 3. Advanced Chart (After 3 wrong or if solved) */}
             {showAdvancedChart && (
                 <div className="md:col-span-2 animate-fade-in">
                      <p className="text-sm text-gray-500 font-bold uppercase mb-2">Clue 2: Advanced Data</p>
                      {playerData?.type === 'batter' ? (
                          <FieldChart data={playerData.sprayChart} />
                      ) : (
                          <DistributionChart distributions={playerData?.pitchDistribution} />
                      )}
                 </div>
             )}
        </div>

        {/* Guess History & Comparisons */}
        {guesses.length > 0 && (
            <div className="mt-8 space-y-4">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-2">猜測紀錄</h3>
                <div className="space-y-4">
                    {guesses.slice().reverse().map((guess, reverseIdx) => {
                        const realIndex = guesses.length - 1 - reverseIdx;
                        return (
                        <div key={realIndex} className={`bg-white rounded-lg shadow border overflow-hidden ${guess.isCorrect ? 'border-green-500' : 'border-red-200'}`}>
                            {/* Guess Header */}
                            <div className={`px-4 py-3 flex justify-between items-center ${guess.isCorrect ? 'bg-green-50' : 'bg-gray-50'}`}>
                                <span className={`font-bold ${guess.isCorrect ? 'text-green-800' : 'text-gray-800'}`}>
                                    {guess.name}
                                </span>
                                {guess.isCorrect ? (
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">正確</span>
                                ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">錯誤</span>
                                )}
                            </div>
                            
                            {/* Comparison Section (Lazy Load) */}
                            {!guess.isCorrect && (
                                <div className="p-2 border-t border-gray-100">
                                    {/* State 1: Data exists, show chart */}
                                    {guess.data && (
                                        <>
                                            <p className="text-xs text-gray-500 mb-2 px-2">與題目比較:</p>
                                            <PRChart stats={guess.data.stats} type={guess.data.type} />
                                        </>
                                    )}

                                    {/* State 2: Error exists, show error */}
                                    {guess.error && (
                                         <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded">
                                            {guess.error}
                                        </div>
                                    )}

                                    {/* State 3: No data/error, show Load button */}
                                    {!guess.data && !guess.error && !guess.isLoading && (
                                        <button 
                                            onClick={() => handleCompare(realIndex)}
                                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-rebas-blue text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>📊</span> 點擊比對數據
                                        </button>
                                    )}

                                    {/* State 4: Loading */}
                                    {guess.isLoading && (
                                        <div className="w-full py-4 flex items-center justify-center text-gray-500 text-sm">
                                            <div className="w-4 h-4 border-2 border-rebas-blue border-t-transparent rounded-full animate-spin mr-2"></div>
                                            正在搜尋數據...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
        )}

        {/* Input Area (Sticky Bottom on Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg md:relative md:bg-transparent md:border-none md:shadow-none md:p-0 z-20">
             <div className="max-w-3xl mx-auto">
                <form onSubmit={handleGuess} className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        disabled={status === GameStatus.WON || status === GameStatus.LOST || isGuessing}
                        placeholder={
                            status === GameStatus.PLAYING ? `輸入球員名字 (剩餘 ${MAX_ATTEMPTS - guesses.length} 次)` : 
                            "遊戲結束"
                        }
                        className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-rebas-blue focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <button 
                        type="submit"
                        disabled={status !== GameStatus.PLAYING || !inputName}
                        className="bg-rebas-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[80px] flex justify-center items-center"
                    >
                        猜測
                    </button>
                </form>
             </div>
        </div>

      </main>

      {/* Grounding Source Footer */}
      {playerData?.sourceUrls && playerData.sourceUrls.length > 0 && (
          <footer className="max-w-3xl mx-auto px-4 py-4 text-xs text-gray-500 text-center w-full">
              <div className="mb-2">
                  <p className="mb-1">資料來源:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                      {playerData.sourceUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-rebas-blue hover:underline truncate max-w-[200px]">
                              {new URL(url).hostname}
                          </a>
                      ))}
                  </div>
              </div>
          </footer>
      )}
    </div>
  );
};

export default App;