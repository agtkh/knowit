const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.KNOWIT_GEMINI_API_KEY });
const model = "gemini-2.0-flash-001";

const getQuestionTextAndExplanationFromAnswer = async (req, res) => {
    try {
        const { answer } = req.body;
        const systemInstruction = `あなたはユーザーが与えた回答から、一問一答形式のクイズ問題文とその解説を生成するAIです。
        出力はPlainTextのJson形式で、{"question_text": "*", "explanation": "*"}の形式で行ってください。配列などは許しません。
        生成する問題文は、ユーザーが提供した回答やその一部をできるだけ含まないように工夫し、回答が一つに絞れるような内容にしてください。`;
        const response = await ai.models.generateContent({
            model: model,
            contents: answer,
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 120,
                // temperature: 0.5,
            },
        });
        let aiResponseText = response.text;
        // console.log("AI Response:", aiResponseText);

        // AIからの応答が空でないか確認
        if (!aiResponseText || aiResponseText.length === 0) {
            console.error("AI model returned an empty response.");
            return res.status(500).json({ error: "AIが空の応答を返しました。" });
        }

        // AIが応答をマークダウンのコードブロックで囲む場合があるため、それを取り除く
        const jsonMatch = aiResponseText.match(/```(json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[2]) {
            aiResponseText = jsonMatch[2];
        }

        try {
            // テキストをJSONオブジェクトにパース（変換）
            const parsedData = JSON.parse(aiResponseText);

            // 必要なキーが存在するか確認
            if (!parsedData.question_text || !parsedData.explanation) {
                console.error("AI response is missing required keys. Response:", aiResponseText);
                return res.status(500).json({ error: "AIの応答に必要なキーが含まれていませんでした。" });
            }

            // 成功した場合、パースしたJSONをクライアントに返す
            return res.status(200).json(parsedData);

        } catch (parseError) {
            // JSONのパースに失敗した場合のエラーハンドリング
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