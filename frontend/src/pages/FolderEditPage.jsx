// frontend/src/pages/FolderEditPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Form, Button, Table, Alert, Modal, Dropdown, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import moment from 'moment';

const FolderEditPage = () => {
  const { id: folderId } = useParams();
  const [folderName, setFolderName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editError, setEditError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [updateResultError, setUpdateResultError] = useState(null); // 正解/不正解更新エラー

  // 質問一覧のソートとフィルタリング
  const [questionSortConfig, setQuestionSortConfig] = useState({ key: null, direction: 'ascending' });
  const [questionFilterText, setQuestionFilterText] = useState('');

  // 質問削除確認用ステート
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [deleteQuestionError, setDeleteQuestionError] = useState('');

  // 移動/コピー用ステート
  const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
  const [selectedQuestionForMoveCopy, setSelectedQuestionForMoveCopy] = useState(null);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [moveCopyAction, setMoveCopyAction] = useState('');
  const [moveCopyError, setMoveCopyError] = useState('');
  const [moveCopySuccessMessage, setMoveCopySuccessMessage] = useState('');

  // CSV インポート関連のステート
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // 質問詳細表示モーダル用ステート
  const [showQuestionDetailModal, setShowQuestionDetailModal] = useState(false);
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState(null);

  const fetchFolderDetails = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      const folderResponse = await axios.get(`/api/folders/${folderId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setFolderName(folderResponse.data.folder_name);
      const questionsResponse = await axios.get(`/api/folders/${folderId}/questions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setQuestions(questionsResponse.data);
      const allFoldersResponse = await axios.get('/api/folders', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setAllFolders(allFoldersResponse.data.filter(folder => folder.id !== parseInt(folderId)));
      setLoading(false);
    } catch (error) {
      console.error('フォルダ詳細の取得に失敗しました:', error);
      setError('フォルダ詳細の取得に失敗しました。');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderDetails();
  }, [folderId]);

  const handleFolderNameChange = (e) => {
    setFolderName(e.target.value);
  };

  const handleSaveFolderName = async () => {
    setEditError(null);
    setSaveSuccess(false);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.put(`/api/folders/${folderId}`, { name: folderName }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setFolderName(response.data.folder_name);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('フォルダ名の更新に失敗しました:', error);
      setEditError('フォルダ名の更新に失敗しました。');
    }
  };

  // 質問一覧のソート
  const requestQuestionSort = (key) => {
    let direction = 'ascending';
    if (questionSortConfig && questionSortConfig.key === key && questionSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setQuestionSortConfig({ key, direction });
  };

  const sortedQuestions = useMemo(() => {
    let sortableQuestions = [...questions];
    if (questionSortConfig !== null && questionSortConfig.key !== null) {
      sortableQuestions.sort((a, b) => {
        if (a[questionSortConfig.key] < b[questionSortConfig.key]) {
          return questionSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[questionSortConfig.key] > b[questionSortConfig.key]) {
          return questionSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableQuestions;
  }, [questions, questionSortConfig]);

  // 質問一覧のフィルタリング
  const handleQuestionFilterChange = (event) => {
    setQuestionFilterText(event.target.value);
  };

  const filteredQuestions = useMemo(() => {
    return sortedQuestions.filter(question =>
      (question.question_text && question.question_text.toLowerCase().includes(questionFilterText.toLowerCase())) ||
      (question.answer && question.answer.toLowerCase().includes(questionFilterText.toLowerCase())) ||
      (question.explanation && question.explanation.toLowerCase().includes(questionFilterText.toLowerCase()))
    );
  }, [sortedQuestions, questionFilterText]);

  // 質問削除
  const handleShowDeleteQuestionModal = (question) => {
    setQuestionToDelete(question);
    setShowDeleteQuestionModal(true);
    setDeleteQuestionError('');
  };

  const handleCloseDeleteQuestionModal = () => {
    setShowDeleteQuestionModal(false);
    setQuestionToDelete(null);
    setDeleteQuestionError('');
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) {
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.delete(`/api/folders/${folderId}/questions/${questionToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setQuestions(questions.filter(question => question.id !== questionToDelete.id));
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error(`質問 ${questionToDelete.id} の削除に失敗しました:`, error);
      setDeleteQuestionError('質問の削除に失敗しました。');
    }
  };

  // 移動/コピー
  const handleShowMoveCopyModal = (question, action) => {
    setSelectedQuestionForMoveCopy(question);
    setMoveCopyAction(action);
    setTargetFolderId('');
    setMoveCopyError('');
    setMoveCopySuccessMessage('');
    setShowMoveCopyModal(true);
  };

  const handleCloseMoveCopyModal = () => {
    setShowMoveCopyModal(false);
    setSelectedQuestionForMoveCopy(null);
    setTargetFolderId('');
    setMoveCopyAction('');
    setMoveCopyError('');
    setMoveCopySuccessMessage('');
  };

  const handleTargetFolderChange = (e) => {
    setTargetFolderId(e.target.value);
  };

  const handleMoveQuestion = async () => {
    if (!selectedQuestionForMoveCopy || !targetFolderId) {
      setMoveCopyError('質問と移動先のフォルダを選択してください。');
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.put(`/api/folders/${folderId}/questions/${selectedQuestionForMoveCopy.id}/move`, {
        target_folder_id: targetFolderId,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setQuestions(questions.filter(q => q.id !== selectedQuestionForMoveCopy.id));
      setMoveCopySuccessMessage(`質問 "${selectedQuestionForMoveCopy.question_text}" を "${allFolders.find(f => f.id === parseInt(targetFolderId))?.folder_name}" に移動しました。`);
      handleCloseMoveCopyModal();
    } catch (error) {
      console.error('質問の移動に失敗しました:', error);
      setMoveCopyError('質問の移動に失敗しました。');
    }
  };

  const handleCopyQuestion = async () => {
    if (!selectedQuestionForMoveCopy || !targetFolderId) {
      setMoveCopyError('質問とコピー先のフォルダを選択してください。');
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.post(`/api/folders/${targetFolderId}/questions/copy`, {
        question_id: selectedQuestionForMoveCopy.id,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setMoveCopySuccessMessage(`質問 "${selectedQuestionForMoveCopy.question_text}" を "${allFolders.find(f => f.id === parseInt(targetFolderId))?.folder_name}" にコピーしました。`);
      handleCloseMoveCopyModal();
    } catch (error) {
      console.error('質問のコピーに失敗しました:', error);
      setMoveCopyError('質問のコピーに失敗しました。');
    }
  };

  // CSV インポート
  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
    setImportError(null);
  };

  const handleImportCsv = async () => {
    if (!importFile) {
      setImportError('CSV ファイルを選択してください。');
      return;
    }

    if (importFile.type !== 'text/csv' && importFile.type !== 'application/vnd.ms-excel') {
      setImportError('CSV ファイル形式のみサポートしています。');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvData = e.target.result;
      const lines = csvData.trim().split('\n').map(line => line.split(','));

      if (lines.length > 0 && lines[0].length !== 3) {
        setImportError('CSV ファイルのフォーマットが正しくありません。question,answer,explain の順で記述してください。');
        setIsImporting(false);
        return;
      }

      const questionsToImport = lines.map(([question, answer, explain]) => ({
        question_text: question ? question.trim() : '',
        answer: answer ? answer.trim() : '',
        explanation: explain ? explain.trim() : '',
        folder_id: folderId,
      })).filter(q => q.question_text && q.answer);

      try {
        const authToken = localStorage.getItem('authToken');
        await axios.post(`/api/folders/${folderId}/import-csv`, { questions: questionsToImport }, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setSaveSuccess('CSV ファイルから質問をインポートしました。');
        setImportFile(null);
        fetchFolderDetails(); // インポート後に質問一覧を再読み込み
      } catch (error) {
        console.error('CSV インポートに失敗しました:', error);
        setImportError('CSV インポートに失敗しました。ファイル形式や内容をご確認ください。');
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      setImportError('ファイルの読み込みに失敗しました。');
      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };

  // 質問詳細表示モーダル
  const handleShowQuestionDetailModal = (question) => {
    setSelectedQuestionDetail(question);
    setShowQuestionDetailModal(true);
    setUpdateResultError(null); // エラーメッセージをリセット
  };

  const handleCloseQuestionDetailModal = () => {
    setShowQuestionDetailModal(false);
    setSelectedQuestionDetail(null);
    setUpdateResultError(null);
  };

  const handleUpdateAnswerResult = async (isCorrect) => {
    if (!selectedQuestionDetail) return;
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.post('/api/questions/answer', {
        questionId: selectedQuestionDetail.id,
        isCorrect: isCorrect,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      // 対象の問題だけ正解数/誤答数/最終回答日時を更新
      setQuestions(prevQuestions =>
        prevQuestions.map(q =>
          q.id === selectedQuestionDetail.id
        ? {
            ...q,
            correct_count: isCorrect
          ? (q.correct_count || 0) + 1
          : q.correct_count,
            incorrect_count: !isCorrect
          ? (q.incorrect_count || 0) + 1
          : q.incorrect_count,
            last_answered_at: new Date().toISOString(),
          }
        : q
        )
      );
      handleCloseQuestionDetailModal();
    } catch (error) {
      console.error('回答結果の更新に失敗しました:', error);
      setUpdateResultError('回答結果の更新に失敗しました。');
    }
  };

  if (loading) {
    return <div>フォルダの詳細と質問を読み込み中...</div>;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <Container className="mt-5">
      <h1>フォルダ編集</h1>
      {editError && <div className="text-danger mb-3">{editError}</div>}
      {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
      {updateResultError && <Alert variant="danger">{updateResultError}</Alert>}

      <Form className="mb-3">
        <Form.Group controlId="formFolderName">
          <Form.Label>フォルダ名</Form.Label>
          <Form.Control
            type="text"
            value={folderName}
            onChange={handleFolderNameChange}
            className="mb-3"
            placeholder={folderName}
          />
        </Form.Group>
        <Button variant="primary" onClick={handleSaveFolderName}>
          保存
        </Button>
      </Form>

      <div>
        <Form.Control type="file" accept=".csv, application/vnd.ms-excel" onChange={handleFileChange} className="me-2" />
      </div>
      <Button variant="success" onClick={handleImportCsv} disabled={!importFile || isImporting}>
        {isImporting ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            インポート
          </>
        ) : (
          'CSVインポート'
        )}
      </Button>
      {importError && <Alert variant="danger" className="mt-2">{importError}</Alert>}

      <h2 className="mt-4">含まれる質問</h2>

      <Button as={Link} to={`/folders/${folderId}/add-question`} variant="success" className="mt-3">
        質問を追加
      </Button>
      <Button as={Link} to="/folders" className="mx-3 mt-3">
        フォルダ一覧に戻る
      </Button>

      <div className="mb-3 d-flex align-items-center">
        <Form.Control
          type="text"
          placeholder="質問の内容、回答、解説でフィルタ"
          value={questionFilterText}
          onChange={handleQuestionFilterChange}
          className="me-2"
        />
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th onClick={() => requestQuestionSort('id')} style={{ cursor: 'pointer' }}>
              ID {questionSortConfig.key === 'id' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestQuestionSort('question_text')} style={{ cursor: 'pointer' }}>
              質問内容 {questionSortConfig.key === 'question_text' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestQuestionSort('correct_count')} style={{ cursor: 'pointer' }}>
              正解数 {questionSortConfig.key === 'correct_count' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestQuestionSort('incorrect_count')} style={{ cursor: 'pointer' }}>
              誤答数 {questionSortConfig.key === 'incorrect_count' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestQuestionSort('correct_rate')} style={{ cursor: 'pointer' }}>
              正答率 {questionSortConfig.key === 'correct_rate' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestQuestionSort('last_answered_at')} style={{ cursor: 'pointer' }}>
              最終回答日時 {questionSortConfig.key === 'last_answered_at' && (questionSortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuestions.map(question => (
            <tr key={question.id} style={{ cursor: 'pointer' }}>
              <td>{question.id}</td>
              <td>{question.question_text}</td>
              <td>{question.correct_count}</td>
              <td>{question.incorrect_count}</td>
              <td>{Number(question.correct_rate).toFixed(2)}</td>
              <td>{question.last_answered_at ? moment(question.last_answered_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</td>
              <td>
                <Button variant="danger" size="sm" onClick={() => handleShowQuestionDetailModal(question)}>回答</Button>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    操作
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to={`/questions/${question.id}/edit`}>編集</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleShowMoveCopyModal(question, 'move')}>移動</Dropdown.Item>
                    <Dropdown.Item onClick={() => MoveCopyModal(question, 'copy')}>コピー</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => handleShowDeleteQuestionModal(question)} className="text-danger">削除</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button as={Link} to={`/folders/${folderId}/add-question`} variant="success" className="mt-3">
        質問を追加
      </Button>
      <Button as={Link} to="/folders" className="mx-3 mt-3">
        フォルダ一覧に戻る
      </Button>

      {/* 質問削除確認モーダル */}
      <Modal show={showDeleteQuestionModal} onHide={handleCloseDeleteQuestionModal}>
        <Modal.Header closeButton>
          <Modal.Title>質問の削除</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteQuestionError && <div className="text-danger mb-2">{deleteQuestionError}</div>}
          {questionToDelete && <p>本当に質問 "{questionToDelete.question_text}" を削除しますか？</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteQuestionModal}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteQuestion}>
            削除
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 移動/コピー モーダル */}
      <Modal show={showMoveCopyModal} onHide={handleCloseMoveCopyModal}>
        <Modal.Header closeButton>
          <Modal.Title>{moveCopyAction === 'move' ? '質問の移動' : '質問のコピー'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {moveCopyError && <Alert variant="danger">{moveCopyError}</Alert>}
          {moveCopySuccessMessage && <Alert variant="success">{moveCopySuccessMessage}</Alert>}
          {selectedQuestionForMoveCopy && (
            <p>
              {moveCopyAction === 'move' ? '移動' : 'コピー'}する質問: "
              <strong>{selectedQuestionForMoveCopy.question_text}</strong>"
            </p>
          )}
          <Form.Group controlId="targetFolder">
            <Form.Label>移動/コピー 先フォルダ</Form.Label>
            <Form.Control
              as="select"
              value={targetFolderId}
              onChange={handleTargetFolderChange}
            >
              <option value="">フォルダを選択してください</option>
              {allFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.folder_name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMoveCopyModal}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={moveCopyAction === 'move' ? handleMoveQuestion : handleCopyQuestion}
            disabled={!targetFolderId}
          >
            {moveCopyAction === 'move' ? '移動' : 'コピー'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 質問詳細表示モーダル */}
      <Modal show={showQuestionDetailModal} onHide={handleCloseQuestionDetailModal}>
        <Modal.Header closeButton>
          <Modal.Title>質問詳細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {updateResultError && <Alert variant="danger">{updateResultError}</Alert>}
          {selectedQuestionDetail && (
            <>
              <h4>{selectedQuestionDetail.question_text}</h4>
              <p><strong>回答:</strong> {selectedQuestionDetail.answer}</p>
              {selectedQuestionDetail.explanation && (
                <p><strong>解説:</strong> {selectedQuestionDetail.explanation}</p>
              )}
              <div className="mt-3">
                <Button variant="success" className="me-2" onClick={() => handleUpdateAnswerResult(true)}>正解</Button>
                <Button variant="danger" onClick={() => handleUpdateAnswerResult(false)}>不正解</Button>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseQuestionDetailModal}>
            閉じる
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FolderEditPage;