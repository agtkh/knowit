// frontend/src/pages/PlayPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import QuestionFormModal from '../components/QuestionFormModal';

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
  const [questionCount] = useState(parseInt(searchParams.get('count') || 10, 10));
  
  const [playMode] = useState(searchParams.get('mode') || 'question-to-answer');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    const fetchPlayData = async () => {
      try {
        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        
        // フォルダ名を取得 (編集モーダルで必要)
        const folderResponse = await axios.get(`/api/folders/${folderId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setFolderName(folderResponse.data.folder_name);

        const response = await axios.get(`/api/folders/play/${folderId}?limit=${questionCount}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setQuestions(response.data);
        if (response.data.length === 0) {
          setError('このフォルダには問題がありません。');
        }
      } catch (err) {
        console.error('Playデータの取得に失敗しました:', err);
        setError('Playデータの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayData();
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
    } catch (error) {
      console.error('回答結果の送信に失敗しました:', error);
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      navigate('/play/result', { state: { answeredQuestions } });
    }
  };

  const handleQuitPlay = () => {
    navigate('/play/result', { state: { answeredQuestions } });
  };

  // --- 編集機能のためのハンドラ ---
  const handleShowEditModal = () => {
    setEditingQuestion(currentQuestion);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingQuestion(null);
    setShowEditModal(false);
  };

  const handleSaveQuestion = () => {
    // 編集された質問を再取得して、現在のリストを更新
    const fetchCurrentQuestion = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await axios.get(`/api/questions/${currentQuestion.id}`, {
                 headers: { Authorization: `Bearer ${authToken}` },
            });
            const updatedQuestion = response.data;
            const newQuestions = [...questions];
            newQuestions[currentQuestionIndex] = updatedQuestion;
            setQuestions(newQuestions);
        } catch(err) {
            console.error("更新された質問の再取得に失敗しました", err);
        }
    }
    fetchCurrentQuestion();
    handleCloseEditModal();
  };
  const questionText = currentQuestion ? (playMode === 'answer-to-question' ? currentQuestion.answer : currentQuestion.question_text) : 'error';
  const answerText = currentQuestion ? (playMode === 'answer-to-question' ? currentQuestion.question_text : currentQuestion.answer) : 'error';
  const explanationText = currentQuestion ? currentQuestion.explanation : '(解説無し)';

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0">問題 {currentQuestionIndex + 1} / {questions.length}</h3>
            {showAnswer && (<Button variant="secondary" onClick={handleShowEditModal}>編集</Button>)}
          </div>
        </Card.Header>
        <Card.Body className="text-center">
          {loading ? (
            <div>問題を読み込み中...</div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : currentQuestion ? (
            <>
              <h2>{questionText}</h2>
              <div className="mt-3">
                {!showAnswer ? (
                  <Button variant="outline-info" onClick={handleShowAnswer}>
                    回答を見る
                  </Button>
                ) : (
                  <div>
                    <p className="alert alert-info">{answerText}</p>
                    <p className="alert alert-secondary">{explanationText}</p>
                    <Button variant="success" className="me-2" onClick={() => handleAnswer(true)}>
                      正解
                    </Button>
                    <Button variant="danger" className="me-2" onClick={() => handleAnswer(false)}>
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
      
      {editingQuestion && (
        <QuestionFormModal
          show={showEditModal}
          onHide={handleCloseEditModal}
          question={editingQuestion}
          folderId={folderId}
          folderName={folderName}
          onSave={handleSaveQuestion}
        />
      )}
    </Container>
  );
};

export default PlayPage;