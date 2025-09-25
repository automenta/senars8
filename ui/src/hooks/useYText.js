import {useEffect, useState} from 'react';
import {DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT, diff_match_patch} from 'diff-match-patch';

/**
 * A custom hook to bind a Y.Text object to a React state.
 * @param {Y.Text} yText The Y.Text object to bind.
 * @returns {[string, function(string): void]} A tuple containing the current value and a function to update it.
 */
export function useYText(yText) {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (!yText) return;

        const observer = () => {
            setValue(yText.toString());
        };

        // Set initial value
        setValue(yText.toString());

        yText.observe(observer);

        return () => {
            yText.unobserve(observer);
        };
    }, [yText]);

    const updateValue = (newValue) => {
        if (!yText || yText.toString() === newValue) {
            return;
        }

        const dmp = new diff_match_patch();
        const diff = dmp.diff_main(yText.toString(), newValue);

        let index = 0;
        yText.doc.transact(() => {
            for (const [op, text] of diff) {
                if (op === DIFF_EQUAL) {
                    index += text.length;
                } else if (op === DIFF_INSERT) {
                    yText.insert(index, text);
                    index += text.length;
                } else if (op === DIFF_DELETE) {
                    yText.delete(index, text.length);
                }
            }
        });
    };

    return [value, updateValue];
}
