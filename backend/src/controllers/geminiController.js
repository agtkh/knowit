const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.KNOWIT_GEMINI_API_KEY });
const model = "gemini-2.0-flash-001";

const getQuestionTextAndExplanationFromAnswer = async (req, res) => {
    try {
        const { answer, folderName, includeFolderName } = req.body;

        // ===== ★ システムプロンプトをより厳密な指示に修正 =====
        let systemInstruction = `あなたは、ユーザーが指定した単語や語句が「正解」となるような、高品質な一問一答形式のクイズを生成する専門家AIです。

# 指示
- ユーザーが与えた「回答」が、唯一の正解となるような「問題文」を1つ生成してください。
- 問題文に対応する「解説」も生成してください。
- 生成する問題文には、ユーザーが与えた「回答」の単語やその一部を、可能な限り含めないでください。

# 禁止事項
- **選択肢問題の禁止:** 「次のうちどれ？」のような、選択肢を提示する問題は絶対に作成しないでください。
- **説明問題の禁止:** 「〜について説明せよ」「〜とは何か」のような、記述式の問題は作成しないでください。生成される問題の答えは、必ずユーザーが与えた「回答」そのものである必要があります。
- **曖昧な問題の禁止:** 答えが複数考えられるような曖昧な問題は作成しないでください。

# 出力形式
- 必ず以下のキーを持つJSON形式で、プレーンテキストとして出力してください。
- JSON以外の説明や前置き、マークダウンの\`\`\`json\`\`\`などは一切含めないでください。
{"question_text": "生成した問題文", "explanation": "生成した解説"}
`;

        if (includeFolderName && folderName && folderName.trim() !== '') {
            systemInstruction += `\n# 追加テーマ\n- 今回は特に「${folderName}」というテーマに沿った問題を作成してください。`;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: answer,
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 200,
            },
        });

        let aiResponseText = response.text;

        if (!aiResponseText || aiResponseText.length === 0) {
            console.error("AI model returned an empty response.");
            return res.status(500).json({ error: "AIが空の応答を返しました。" });
        }

        const jsonMatch = aiResponseText.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            aiResponseText = jsonMatch[2];
        }

        try {
            const parsedData = JSON.parse(aiResponseText);

            if (!parsedData.question_text || !parsedData.explanation) {
                console.error("AI response is missing required keys. Response:", aiResponseText);
                return res.status(500).json({ error: "AIの応答に必要なキーが含まれていませんでした。" });
            }

            return res.status(200).json(parsedData);

        } catch (parseError) {
            console.error("Failed to parse JSON from AI response:", parseError);
            console.error("Raw AI response text was:", aiResponseText);
            return res.status(500).json({ error: "AIの応答をJSONとして解釈できませんでした。" });
        }

    } catch (error) {
        console.error("Error generating content:", error);
        return res.status(500).json({ error: "Failed to generate content" });
    }

};

module.exports = {
    getQuestionTextAndExplanationFromAnswer,
};