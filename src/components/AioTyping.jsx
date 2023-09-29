// AioTyping.jsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// eslint-disable-next-line react/prop-types
const AioTyping = ({ contents = {} }) => {
    let [itemIndex, setItemIndex] = useState(0);
    let [typeSlashed, setTypeSlashed] = useState(true);
    let [englishText, setEnglishText] = useState("");
    let [translationSlashed, setTranslationSlashed] = useState("");
    const updateTexts = (index) => {
        setEnglishText(contents.items[index].englishText);
        if (typeSlashed)
            setTranslationSlashed(contents.items[index].translation_slashed);
        else
            setTranslationSlashed(contents.items[index].translation_natural);
    }
    useEffect(() => {
        console.log('useEffect is called');
        updateTexts(itemIndex);
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
            }
        };
        // イベントリスナーを追加
        window.addEventListener('keydown', handleKeyDown);

        // コンポーネントがアンマウントされた時にイベントリスナーを解除
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [contents]);
    // テキストコンテンツの更新
    useEffect(() => {
        console.log(`itemIndex is ${itemIndex}`);
        updateTexts(itemIndex);
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
            <Typography align="center" sx={{ color: 'red' }}>
                [Tab]=(訳語切替)、[右Key]=(次へ)、[左Key]=(前へ)
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                原文（タイピング対象）：
            </Box>
            <Typography variant="h6" gutterBottom>
                {englishText}
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                訳文（{ (typeSlashed) ? "語順訳" : "和訳"}）：
            </Box>
            <Typography variant="bodyTranslation" gutterBottom>
                {translationSlashed}
            </Typography>
            <Box mt={2}></Box>
        </Box>
    );
}
export default AioTyping;