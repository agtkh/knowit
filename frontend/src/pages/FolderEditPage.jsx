// frontend/src/pages/FolderEditPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Form, Button, Alert, Modal, Dropdown, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import moment from 'moment';
import DataTable from 'react-data-table-component';

const FolderEditPage = () => {
  const { id: folderId } = useParams();
  const [folderName, setFolderName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editError, setEditError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [updateResultError, setUpdateResultError] = useState(null);

  const [questionFilterText, setQuestionFilterText] = useState('');
  const [resetQuestionPaginationToggle, setResetQuestionPaginationToggle] = useState(false);

  // 複数選択用のStateを追加
  const [selectedRows, setSelectedRows] = useState([]);
  const [toggledClearRows, setToggleClearRows] = useState(false);

  // 質問削除確認用ステート (複数削除に対応)
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionsToDelete, setQuestionsToDelete] = useState([]); // 単数 -> 複数に対応
  const [deleteQuestionError, setDeleteQuestionError] = useState('');

  // 移動/コピー用ステート (複数移動/コピーに対応)
  const [showMoveCopyModal, setShowMoveCopyModal] = useState(false);
  const [questionsForMoveCopy, setQuestionsForMoveCopy] = useState([]); // 単数 -> 複数に対応
  const [targetFolderId, setTargetFolderId] = useState('');
  const [moveCopyAction, setMoveCopyAction] = useState('');
  const [moveCopyError, setMoveCopyError] = useState('');
  const [moveCopySuccessMessage, setMoveCopySuccessMessage] = useState('');

  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

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

    } catch (error) {
      console.error('フォルダ詳細の取得に失敗しました:', error);
      setError('フォルダ詳細の取得に失敗しました。');
    } finally {
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
      setSaveSuccess('フォルダ名を保存しました。');
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('フォルダ名の更新に失敗しました:', error);
      setEditError('フォルダ名の更新に失敗しました。');
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!questionFilterText) return questions;
    return questions.filter(
      (question) =>
        (question.question_text && question.question_text.toLowerCase().includes(questionFilterText.toLowerCase())) ||
        (question.answer && question.answer.toLowerCase().includes(questionFilterText.toLowerCase())) ||
        (question.explanation && question.explanation.toLowerCase().includes(questionFilterText.toLowerCase()))
    );
  }, [questions, questionFilterText]);

  const handleQuestionFilterChange = (event) => {
    if (event.target.value) {
      setQuestionFilterText(event.target.value);
    } else {
      setQuestionFilterText('');
      setResetQuestionPaginationToggle(!resetQuestionPaginationToggle);
    }
  };

  // DataTable の行選択イベントハンドラ
  const handleRowSelected = React.useCallback(state => {
    setSelectedRows(state.selectedRows);
  }, []);

  // 選択解除ボタンクリック時の処理
  const handleClearRows = () => {
    setToggleClearRows(!toggledClearRows);
  };

  // 質問削除モーダル関連 (複数削除に対応)
  const handleShowDeleteQuestionModal = (question = null) => {
    // 個別の質問削除の場合
    if (question) {
      setQuestionsToDelete([question]);
    } else {
      // 複数選択削除の場合
      setQuestionsToDelete(selectedRows);
    }
    setShowDeleteQuestionModal(true);
    setDeleteQuestionError('');
  };

  const handleCloseDeleteQuestionModal = () => {
    setShowDeleteQuestionModal(false);
    setQuestionsToDelete([]);
    setDeleteQuestionError('');
    handleClearRows(); // 選択を解除
  };

  const handleConfirmDeleteQuestion = async () => {
    if (questionsToDelete.length === 0) {
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      // 選択された質問IDの配列をバックエンドに送信
      await axios.post(`/api/questions/delete-multiple`, {
        question_ids: questionsToDelete.map(q => q.id),
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      // 削除された質問をリストから除外
      setQuestions(prevQuestions =>
        prevQuestions.filter(q => !questionsToDelete.some(deletedQ => deletedQ.id === q.id))
      );
      setShowDeleteQuestionModal(false);
      setQuestionsToDelete([]);
      handleClearRows(); // 選択を解除
    } catch (error) {
      console.error('質問の削除に失敗しました:', error);
      setDeleteQuestionError('質問の削除に失敗しました。');
    }
  };

  // 移動/コピー モーダル関連 (複数移動/コピーに対応)
  const handleShowMoveCopyModal = (question = null, action) => {
    // 個別の質問の場合
    if (question) {
      setQuestionsForMoveCopy([question]);
    } else {
      // 複数選択の場合
      setQuestionsForMoveCopy(selectedRows);
    }
    setMoveCopyAction(action);
    setTargetFolderId('');
    setMoveCopyError('');
    setMoveCopySuccessMessage('');
    setShowMoveCopyModal(true);
  };

  const handleCloseMoveCopyModal = () => {
    setShowMoveCopyModal(false);
    setQuestionsForMoveCopy([]);
    setTargetFolderId('');
    setMoveCopyAction('');
    setMoveCopyError('');
    setMoveCopySuccessMessage('');
    handleClearRows(); // 選択を解除
  };

  const handleTargetFolderChange = (e) => {
    setTargetFolderId(e.target.value);
  };

  const handleMoveQuestions = async () => {
    if (questionsForMoveCopy.length === 0 || !targetFolderId) {
      setMoveCopyError('質問と移動先のフォルダを選択してください。');
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      // 選択された質問IDの配列をバックエンドに送信
      await axios.post(`/api/questions/move-multiple`, {
        question_ids: questionsForMoveCopy.map(q => q.id),
        target_folder_id: targetFolderId,
        source_folder_id: folderId, // 移動元のフォルダIDを送信
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      // 移動された質問をリストから除外
      setQuestions(prevQuestions =>
        prevQuestions.filter(q => !questionsForMoveCopy.some(movedQ => movedQ.id === q.id))
      );
      setMoveCopySuccessMessage(`${questionsForMoveCopy.length} 件の質問を "${allFolders.find(f => f.id === parseInt(targetFolderId))?.folder_name}" に移動しました。`);
      handleCloseMoveCopyModal();
    } catch (error) {
      console.error('質問の移動に失敗しました:', error);
      setMoveCopyError('質問の移動に失敗しました。');
    }
  };

  const handleCopyQuestions = async () => {
    if (questionsForMoveCopy.length === 0 || !targetFolderId) {
      setMoveCopyError('質問とコピー先のフォルダを選択してください。');
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      // 選択された質問IDの配列をバックエンドに送信
      await axios.post(`/api/questions/copy-multiple`, {
        question_ids: questionsForMoveCopy.map(q => q.id),
        target_folder_id: targetFolderId,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setMoveCopySuccessMessage(`${questionsForMoveCopy.length} 件の質問を "${allFolders.find(f => f.id === parseInt(targetFolderId))?.folder_name}" にコピーしました。`);
      handleCloseMoveCopyModal();
      // コピーは現在のフォルダの質問リストには影響しないので、再フェッチは不要（必要なら行う）
    } catch (error) {
      console.error('質問のコピーに失敗しました:', error);
      setMoveCopyError('質問のコピーに失敗しました。');
    }
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
    setImportError(null);
  };

  const handleImportCsv = async () => {
    if (!importFile) {
      setImportError('CSV ファイルを選択してください。');
      return;
    }

    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/comma-separated-values'];
    if (!allowedTypes.includes(importFile.type)) {
      setImportError('CSV ファイル形式のみサポートしています。');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvData = e.target.result;
      const lines = csvData.trim().split('\n').map(line => line.split(','));

      if (lines.length === 0 || lines[0].length < 2) {
        setImportError('CSV ファイルのフォーマットが正しくありません。question,answer[,explain] の順で記述してください。');
        setIsImporting(false);
        return;
      }

      const questionsToImport = lines.map(([question, answer, explain]) => ({
        question_text: question ? question.trim() : '',
        answer: answer ? answer.trim() : '',
        explanation: explain ? explain.trim() : '',
        folder_id: folderId,
      })).filter(q => q.question_text && q.answer);

      if (questionsToImport.length === 0) {
        setImportError('CSV ファイルに有効な質問データが見つかりませんでした。');
        setIsImporting(false);
        return;
      }

      try {
        const authToken = localStorage.getItem('authToken');
        await axios.post(`/api/folders/${folderId}/import-csv`, { questions: questionsToImport }, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setSaveSuccess(`CSV ファイルから ${questionsToImport.length} 件の質問をインポートしました。`);
        setImportFile(null);
        await fetchFolderDetails();
        setTimeout(() => setSaveSuccess(false), 3000);
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

  const handleShowQuestionDetailModal = (question) => {
    setSelectedQuestionDetail(question);
    setShowQuestionDetailModal(true);
    setUpdateResultError(null);
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
      await fetchFolderDetails();
      handleCloseQuestionDetailModal();
    } catch (error) {
      console.error('回答結果の更新に失敗しました:', error);
      setUpdateResultError('回答結果の更新に失敗しました。');
    }
  };

  // DataTable のカラム定義
  const columns = useMemo(
    () => [
      {
        name: '質問内容',
        selector: (row) => row.question_text,
        sortable: false,
      },
      {
        name: '総回答数',
        selector: (row) => row.total_count || 0,
        sortable: true,
        width: '120px',
      },
      {
        name: '正答率',
        selector: (row) => `${(row.correct_rate * 1.0).toFixed(2)}%`,
        sortable: true,
        width: '100px',
      },
      {
        name: '最終回答日時',
        selector: (row) => row.last_answered_at ? moment(row.last_answered_at).format('YYYY-MM-DD HH:mm:ss') : '-',
        sortable: true,
        width: '180px',
      },
      {
        name: '操作',
        cell: (row) => (
          <>
            <Button variant="danger" size="sm" onClick={() => handleShowQuestionDetailModal(row)} className="me-2">
              回答
            </Button>
            <Button
              as={Link}
              to={`/questions/${row.id}/edit`}
              variant="primary"
              size="sm"
              className="me-1"
            >
              編集
            </Button>
            <Button
              variant="info"
              size="sm"
              onClick={() => handleShowMoveCopyModal(row, 'move')}
              className="me-1"
            >
              移動
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleShowMoveCopyModal(row, 'copy')}
              className="me-1"
            >
              コピー
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleShowDeleteQuestionModal(row)}
            >
              削除
            </Button>
          </>
        ),
        ignoreRowClick: true,
        width: '350px',
      },
    ],
    [],
  );

  const customStyles = {
    headCells: {
      style: {
        fontSize: '1rem',
        fontWeight: 'bold',
        backgroundColor: '#f8f9fa',
      },
    },
    cells: {
      style: {
        fontSize: '0.9rem',
      },
    },
  };

  if (loading) {
    return <Alert variant="info">フォルダの詳細と質問を読み込み中...</Alert>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Container className="mt-5">
      <h1>フォルダ編集</h1>
      {editError && <Alert variant="danger" className="mb-3">{editError}</Alert>}
      {saveSuccess && <Alert variant="success" className="mb-3">{saveSuccess}</Alert>}
      {updateResultError && <Alert variant="danger" className="mb-3">{updateResultError}</Alert>}

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

      <h2 className="mt-4">質問のインポート</h2>
      <div className="d-flex align-items-center mb-3">
        <Form.Control type="file" accept=".csv, application/vnd.ms-excel" onChange={handleFileChange} className="me-2" />
        <Button variant="success" onClick={handleImportCsv} disabled={!importFile || isImporting}>
          {isImporting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              インポート中...
            </>
          ) : (
            'CSVインポート'
          )}
        </Button>
      </div>
      {importError && <Alert variant="danger">{importError}</Alert>}


      <h2 className="mt-4">含まれる質問</h2>

      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Form.Control
          type="text"
          placeholder="質問の内容、回答、解説でフィルタ"
          value={questionFilterText}
          onChange={handleQuestionFilterChange}
          className="me-2"
          style={{ maxWidth: '300px' }}
        />
        <div className="d-flex">
          {selectedRows.length > 0 && (
            <>
              <Button variant="danger" onClick={() => handleShowDeleteQuestionModal()} className="me-2">
                選択した質問を削除 ({selectedRows.length})
              </Button>
              <Button variant="info" onClick={() => handleShowMoveCopyModal(null, 'move')} className="me-2">
                選択した質問を移動 ({selectedRows.length})
              </Button>
              <Button variant="secondary" onClick={() => handleShowMoveCopyModal(null, 'copy')} className="me-2">
                選択した質問をコピー ({selectedRows.length})
              </Button>
              <Button variant="outline-secondary" onClick={handleClearRows} className="me-2">
                選択解除
              </Button>
            </>
          )}
          <Button as={Link} to={`/folders/${folderId}/add-question`} variant="success" className="me-2">
            質問を追加
          </Button>
          <Button as={Link} to="/folders">
            フォルダ一覧に戻る
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredQuestions}
        pagination
        paginationResetDefaultPage={resetQuestionPaginationToggle}
        highlightOnHover
        pointerOnHover
        striped
        responsive
        noDataComponent="表示する質問がありません。"
        customStyles={customStyles}
        selectableRows // これを追加してチェックボックスを表示
        onSelectedRowsChange={handleRowSelected} // 選択された行の変更を監視
        clearSelectedRows={toggledClearRows} // 選択状態をリセットするためのトリガー
        onRowClicked={handleShowQuestionDetailModal} // 行をクリックしたときの処理
      />

      {/* 質問削除確認モーダル */}
      <Modal show={showDeleteQuestionModal} onHide={handleCloseDeleteQuestionModal}>
        <Modal.Header closeButton>
          <Modal.Title>質問の削除</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteQuestionError && <Alert variant="danger" className="mb-2">{deleteQuestionError}</Alert>}
          {questionsToDelete.length > 0 ? (
            <p>
              本当に選択した {questionsToDelete.length} 件の質問を削除しますか？
            </p>
          ) : (
            <p>削除する質問が選択されていません。</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteQuestionModal}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteQuestion} disabled={questionsToDelete.length === 0}>
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
          {!moveCopySuccessMessage && (
            <>
              {questionsForMoveCopy.length > 0 ? (
                <p>
                  {moveCopyAction === 'move' ? '移動' : 'コピー'}する質問 ({questionsForMoveCopy.length} 件):{' '}
                  {questionsForMoveCopy.map(q => `"${q.question_text}"`).join(', ')}
                </p>
              ) : (
                <p>{moveCopyAction === 'move' ? '移動' : 'コピー'}する質問が選択されていません。</p>
              )}
              <Form.Group controlId="targetFolder">
                <Form.Label>{moveCopyAction === 'move' ? '移動' : 'コピー'} 先フォルダ</Form.Label>
                <Form.Control
                  as="select"
                  value={targetFolderId}
                  onChange={handleTargetFolderChange}
                  disabled={questionsForMoveCopy.length === 0}
                >
                  <option value="">フォルダを選択してください</option>
                  {allFolders.length === 0 ? (
                    <option value="" disabled>他にフォルダがありません</option>
                  ) : (
                    allFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.folder_name}
                      </option>
                    ))
                  )}
                </Form.Control>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMoveCopyModal}>
            閉じる
          </Button>
          {!moveCopySuccessMessage && (
            <Button
              variant="primary"
              onClick={moveCopyAction === 'move' ? handleMoveQuestions : handleCopyQuestions}
              disabled={questionsForMoveCopy.length === 0 || !targetFolderId}
            >
              実行
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* 質問詳細表示モーダル (変更なし) */}
      <Modal show={showQuestionDetailModal} onHide={handleCloseQuestionDetailModal}>
        <Modal.Header closeButton>
          <Modal.Title>質問詳細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {updateResultError && <Alert variant="danger" className="mb-3">{updateResultError}</Alert>}
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