// TypingContent.jsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import styled from 'styled-components';

const StyledShowText = styled.div`
    font-family: monospace;
    font-size: 1.25rem;
`;

// eslint-disable-next-line react/prop-types
const TypingContent = ({ typingText }) => {
    let [showText, setShowText] = useState("");
    let [location, setLocation] = useState(0); // location of Text
    let [isContentFinished, setContentFinished] = useState(false);
    let loc = 0;
    const removeLastCharacter = (Text) => {
        return Text.substring(0, Text.length - 1);
    }
    let word = removeLastCharacter(typingText);
    let wordUpper = word.toUpperCase();
    let wordLower = word.toLowerCase();

    const findNextLocation = (text, location) => {
        console.log('#findNextLocation');
        // debugger;
        let nextLocation = location;
        if (nextLocation < text.length) {
            const regex = /[0-9A-Za-z]/g;
            while (text[nextLocation].match(regex) === null && nextLocation < text.length - 1) {
                nextLocation = (nextLocation < text.length) ? nextLocation + 1 : nextLocation;
                console.log('search ...');
            }
        }
        console.log(`nextLocation ${nextLocation}`);
        return nextLocation;
    }
    useEffect(() => {
        console.log('useEffect is called');
        // setShowText(removeLastCharacter(typingText));
        // word = removeLastCharacter(typingText);
        word = removeLastCharacter(typingText);
        wordUpper = word.toUpperCase();
        wordLower = word.toLowerCase();
        loc = findNextLocation(word, 0);
        setLocation(0);
        setShowText(typingText);
        setContentFinished(false);

        // イベントリスナーの設定
        const handleKeyDown = (e) => {
            console.log(e.key);
            console.log(`loc is ${location}`);
            console.log(`word[loc] is ${word[loc]}`);
            if (isContentFinished) {
                return;
            } else if (e.key !== wordUpper[loc] && e.key !== wordLower[loc] && loc < word.length - 1) {
                return;
            } else {
                let _beforeReplaced = (loc === 0) ? "" : word.substring(0, loc);
                let _afterReplaced = (loc === (word.length - 1)) ? "" : word.substring(loc + 1, word.length);
                let _showTargetText = _beforeReplaced + "_" + _afterReplaced;
                word = _showTargetText;
                // targetElem.textContent = _showTargetText;
                let nextLoc = (loc < word.length) ? loc + 1 : loc;
                console.log(`next location is ${nextLoc}`)
                // setLoc(findNextLocation(word, nextLoc));
                loc = findNextLocation(word, nextLoc);
                setShowText(_showTargetText);
                setLocation(loc);
                // setLoc((prev) => {
                //     return ((prev < word.length - 1) ? prev + 1 : prev);
                // });
                if (loc >= word.length || (loc == word.length - 1 && word[loc] === "”")) {
                    // _showFinishContent();
                    setContentFinished(true);
                }
            }

            // if (e.key === "Enter") {
            //     if (contents_index.length === 0) { // 終了条件
            //         gotoMenu();
            //     } else {
            //         current_index = nextContent(targetElem, current_index);
            //     }
            // }
            // return;
        }

        document.addEventListener('keydown', handleKeyDown);
        // findNextLocation(typingText, 0);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        }
    }, [typingText]);


    return (
        <>
            <Box mt={2} fontWeight={"bold"} >
                タイピング対象： {
                    (isContentFinished) ?
                        (<span>Finish!</span>) :
                        (<span>location {location} in {showText.length}.</span>)
                }
            </Box>
            <StyledShowText>
                {showText}
            </StyledShowText>
        </>
    );
}

export default TypingContent;