// AioTyping.jsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// eslint-disable-next-line react/prop-types
const AioTyping = ({ contents = {}}) => {
    let [englishText, setEnglishText] = useState("");
    let [translationSlashed, setTranslationSlashed] = useState("");
    useEffect(() => {
        console.log('useEffect is called');
        console.log(contents.items[0]);
        setEnglishText(contents.items[0].englishText);
        setTranslationSlashed(contents.items[0].translation_slashed);
    }, [contents]);
    return (
        <Box
            sx={{
                width: '90%',
                maxWidth: 640,
                marginX: 4,
                bgcolor: 'background.paper'
            }}
        >
            <Typography variant="h4" align="center" gutterBottom>
                aio-typing
            </Typography>
            <Typography variant="h6" gutterBottom>
                {contents.category_name}
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                訳文：
            </Box>
            <Typography variant="bodyTranslation" gutterBottom>
                {translationSlashed}
            </Typography>

            <Box mt={2} fontWeight={"bold"} >
                原文（タイピング対象）：
            </Box>
            <Typography variant="bodyEnglish" gutterBottom>
                {englishText}
            </Typography>
            <Box mt={2}></Box>
        </Box>
    );
}
export default AioTyping;