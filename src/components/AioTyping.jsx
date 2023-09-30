// AioTyping.jsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ReactAudioPlayer from 'react-audio-player';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleIcon from '@mui/icons-material/StopCircle';

// eslint-disable-next-line react/prop-types
const AioTyping = ({ contents = {} }) => {
    let [itemIndex, setItemIndex] = useState(0);
    let [typeSlashed, setTypeSlashed] = useState(true);
    let [englishText, setEnglishText] = useState("");
    let [translationSlashed, setTranslationSlashed] = useState("");

    const baseAudioUrl = "/assets/Natural_419"
    let [audioUrl, setAudioUrl] = useState(`${baseAudioUrl}/001.mp3`);
    let [isAudioPlaying, setAudioPlaying] = useState(false);

    const updateTexts = (index) => {
        setEnglishText(contents.items[index].englishText);
        if (typeSlashed)
            setTranslationSlashed(contents.items[index].translation_slashed);
        else
            setTranslationSlashed(contents.items[index].translation_natural);
    }

    const updateAudioUrl = (baseAudioUrl, audioNo) => {
        let audioFile = audioNo.toString().padStart(3, '0') + ".mp3";
        console.log(`set audio of ${audioFile}`);
        setAudioUrl(`${baseAudioUrl}/${audioFile}`);
        setAudioPlaying(true); // 自動再生する
    }
    const AudioPlayer = (porps) => {
        const handleTogglePlay = () => {
            porps.setPlaying((prev) => !prev);
        };
        return (
            <div>
                <ReactAudioPlayer
                    src={porps.audioSrc}
                    autoPlay={porps.isPlaying}
                    controls={false}
                />
                <Button variant="contained" onClick={handleTogglePlay}>
                    {porps.isPlaying ?
                        (<><StopCircleIcon /> Stop</>) :
                        (<><PlayCircleOutlineIcon /> Play</>)
                    }
                </Button>
            </div>
        );
    };

    useEffect(() => {
        console.log('useEffect is called');
        // イベントリスナーの設定
        const handleKeyDown = (event) => {
            if (event.key === 'ArrowRight') {
                // console.log('右キーが押されました！');
                setItemIndex(prev => (prev < contents.items.length - 1) ? prev + 1 : prev);
            } else if (event.key === 'ArrowLeft') {
                // console.log('左キーが押されました！');
                setItemIndex(prev => (prev > 0) ? prev - 1 : prev);
            } else if (event.key === 'Tab') {
                console.log('Tabキーが押されました！');
                setTypeSlashed(prev => !prev);
                event.preventDefault(); // デフォルトの動作を防ぐ
            } else if (event.key === ' ') {
                // SPACEキーでオーディオ再生をトグル
                console.log('SPACEキーが押されました！');
                setAudioPlaying((prev) => !prev);
            }
        };

        // イベントリスナーを追加
        window.addEventListener('keydown', handleKeyDown);

        // 表示テキストを設定
        updateTexts(0);
        // オーディオファイルパスを設定
        updateAudioUrl(baseAudioUrl, contents.items[0].no);

        // コンポーネントがアンマウントされた時にイベントリスナーを解除
        return () => {
            setAudioPlaying(false);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contents]);
    // テキストコンテンツの更新
    useEffect(() => {
        console.log(`itemIndex is ${itemIndex}`);
        updateTexts(itemIndex);
        // オーディオファイルパスを設定
        updateAudioUrl(baseAudioUrl, contents.items[itemIndex].no);

        // アイテム切り替え時は再生停止
        return () => {
            setAudioPlaying(false);
        };
    }, [itemIndex, typeSlashed]);

    return (
        <Box
            sx={{
                width: '90%',
                maxWidth: 640,
                marginX: 4,
                bgcolor: 'background.paper'
            }}
        >
            <Typography variant="h6" gutterBottom>
                {contents.category_name}（{(itemIndex + 1)}／{(contents.items.length)}）
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: 'red' }}>
                [SPACE]=(再生), [Tab]=(訳語切替), [右Key]=(次へ), [左Key]=(前へ)
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                原文（タイピング対象）：
            </Box>
            <Typography variant="h6" gutterBottom>
                {englishText}
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                訳文（{(typeSlashed) ? "語順訳" : "和訳"}）：
            </Box>
            <Typography variant="bodyTranslation" gutterBottom>
                {translationSlashed}
            </Typography>

            <Box align="center" mt={4} mb={4} >
                <AudioPlayer
                    audioSrc={audioUrl}
                    isPlaying={isAudioPlaying}
                    setPlaying={setAudioPlaying}
                />
            </Box>
        </Box>
    );
}
export default AioTyping;