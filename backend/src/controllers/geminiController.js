const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.KNOWIT_GEMINI_API_KEY });
const model = "gemini-2.0-flash-001";

const getQuestionTextAndExplanationFromAnswer = async (req, res) => {
    try {
        // ★ リクエストボディから新しいパラメータを受け取る
        const { answer, folderName, includeFolderName } = req.body;

        // ★ システムプロンプトを動的に構築
        let systemInstruction = `あなたはユーザーが与えた回答から、一問一答形式のクイズ問題文とその解説を生成するAIです。
        出力はPlainTextのJson形式で、{"question_text": "*", "explanation": "*"}の形式で行ってください。配列などは許しません。
        生成する問題文は、ユーザーが提供した回答やその一部をできるだけ含まないように工夫し、回答が一つに絞れるような内容にしてください。`;

        // フォルダ名を含めるオプションが有効な場合、指示を追加
        if (includeFolderName && folderName && folderName.trim() !== '') {
            systemInstruction += `\n特に、あなたは「${folderName}」というテーマに沿った問題を作成する専門家です。そのテーマに関する問題を作成してください。`;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: answer,
            config: {
                systemInstruction: systemInstruction, // ★ 動的に生成した指示を渡す
                maxOutputTokens: 200,
                // temperature: 0.5,
            },
        });

        // 応答の処理は変更なし
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