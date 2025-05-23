// frontend/src/pages/PlayResultPage.jsx
import React from 'react';
import { Container, Card, Button, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';

const PlayResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location;
  const answeredQuestions = state?.answeredQuestions || [];

  const correctCount = answeredQuestions.filter(q => q.userAnsweredCorrectly).length;
  const incorrectCount = answeredQuestions.length - correctCount;
  const accuracy = answeredQuestions.length > 0 ? (correctCount / answeredQuestions.length) * 100 : 0;

  const handleGoBack = () => {
    navigate('/folders');
  };

  return (
    <Container className="mt-5">
      <Card>
        <Card.Header>
          <h2>Play 結果</h2>
        </Card.Header>
        <Card.Body>
          <p>正解数: <strong>{correctCount} / {answeredQuestions.length}</strong></p>
          <p>不正解数: <strong>{incorrectCount} / {answeredQuestions.length}</strong></p>
          <p>正答率: <strong>{accuracy.toFixed(2)}%</strong></p>

          {answeredQuestions.length > 0 && (
            <div className="mt-4">
              <h3>回答詳細</h3>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>問題</th>
                    <th>正解</th>
                    <th>結果</th>
                  </tr>
                </thead>
                <tbody>
                  {answeredQuestions.map((item, index) => (
                    <tr key={index} className={!item.userAnsweredCorrectly && 'table-danger'}>
                      <td>{item.questionText}</td>
                      <td>{item.correctAnswer}</td>
                      <td>{item.userAnsweredCorrectly ? '正解' : '不正解'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <Button variant="primary" onClick={handleGoBack}>
            フォルダ一覧に戻る
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PlayResultPage;
