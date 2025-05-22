// frontend/src/pages/PlayPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

const PlayPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [questionCount] = useState(parseInt(searchParams.get('count') || 10, 10)); // デフォルトは10問

  useEffect(() => {
    const fetchPlayQuestions = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await axios.get(`/api/folders/play/${folderId}?limit=${questionCount}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setQuestions(response.data);
        if (response.data.length === 0) {
          setError('このフォルダには問題がありません。');
        }
        setLoading(false);
      } catch (error) {
        console.error('Play 問題の取得に失敗しました:', error);
        setError('Play 問題の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchPlayQuestions();
  }, [folderId, questionCount]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleAnswer = async (isCorrect) => {
    if (!currentQuestion) return;

    const answeredQuestion = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question_text,
      correctAnswer: currentQuestion.answer,
      userAnsweredCorrectly: isCorrect,
    };
    setAnsweredQuestions([...answeredQuestions, answeredQuestion]);
    setShowAnswer(false);

    try {
      const authToken = localStorage.getItem('authToken');
      await axios.post('/api/questions/answer', {
        questionId: currentQuestion.id,
        isCorrect: isCorrect,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      // 回答結果の処理が成功した場合の処理 (必要に応じて)
    } catch (error) {
      console.error('回答結果の送信に失敗しました:', error);
      // エラー処理 (必要に応じて)
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 全問回答済みの場合も結果画面へ遷移
      navigate('/play/result', { state: { answeredQuestions } });
    }
  };

  const handleQuitPlay = () => {
    // 途中でやめた場合も、その時点までの回答結果を渡して結果画面へ遷移
    navigate('/play/result', { state: { answeredQuestions } });
  };

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header>
          <h3>問題 {currentQuestionIndex + 1} / {questions.length}</h3>
        </Card.Header>
        <Card.Body className="text-center">
          {loading ? (
            <div>問題を読み込み中...</div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : currentQuestion ? (
            <>
              <h2>{currentQuestion.question_text}</h2>
              <div className="mt-3">
                {!showAnswer ? (
                  <Button variant="outline-info" onClick={handleShowAnswer}>
                    回答を見る
                  </Button>
                ) : (
                  <div>
                    <p className="alert alert-info">{currentQuestion.answer}</p>
                    <Button variant="success" className="me-2" onClick={() => handleAnswer(true)}>
                      正解
                    </Button>
                    <Button variant="danger" onClick={() => handleAnswer(false)}>
                      不正解
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>問題がありません。</div>
          )}
        </Card.Body>
        <Card.Footer className="text-end">
          <Button variant="warning" onClick={handleQuitPlay}>
            途中でやめる
          </Button>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default PlayPage;