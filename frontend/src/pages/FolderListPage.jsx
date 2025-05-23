// frontend/src/pages/FolderListPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Form, Button, Modal } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // useNavigate をインポート

const FolderListPage = () => {
  const [folders, setFolders] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 新規フォルダ作成用ステート
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderError, setCreateFolderError] = useState('');

  // フォルダ削除用ステート
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [deleteFolderError, setDeleteFolderError] = useState('');

  // フォルダコピー用ステート
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [folderToCopy, setFolderToCopy] = useState(null);
  const [copyFolderName, setCopyFolderName] = useState('');
  const [copyFolderError, setCopyFolderError] = useState('');

  const navigate = useNavigate(); // useNavigate のインスタンスを作成

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await axios.get('/api/folders', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          }
        });
        setFolders(response.data);
        setLoading(false);
      } catch (error) {
        console.error('フォルダ一覧の取得に失敗しました:', error);
        setError('フォルダ一覧の取得に失敗しました。');
        setLoading(false);
      }
    };

    fetchFolders();
  }, []);

  const sortedFolders = useMemo(() => {
    let sortableFolders = [...folders];
    if (sortConfig !== null && sortConfig.key !== null) {
      sortableFolders.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableFolders;
  }, [folders, sortConfig]);

  const filteredFolders = useMemo(() => {
    return sortedFolders.filter(folder =>
      folder.folder_name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [sortedFolders, filterText]);

  const requestSort = key => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = event => {
    setFilterText(event.target.value);
  };

  const handleShowCreateModal = () => setShowCreateModal(true);
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewFolderName('');
    setCreateFolderError('');
  };

  const handleCreateNewFolder = async () => {
    setCreateFolderError('');
    if (!newFolderName.trim()) {
      setCreateFolderError('フォルダ名を入力してください。');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post('/api/folders', {
        name: newFolderName,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      console.log('フォルダ作成成功:', response.data);
      setFolders([...folders, { id: response.data.id, folder_name: response.data.folder_name, question_count: 0 }]); // 初期問題数は0
      handleCloseCreateModal();
    } catch (error) {
      console.error('フォルダ作成に失敗しました:', error);
      setCreateFolderError('フォルダの作成に失敗しました。');
    }
  };

  const handleShowDeleteModal = (folder) => {
    setFolderToDelete(folder);
    setShowDeleteModal(true);
    setDeleteFolderError('');
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setFolderToDelete(null);
    setDeleteFolderError('');
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) {
      return;
    }
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.delete(`/api/folders/${folderToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      console.log('フォルダ削除成功:', folderToDelete.id);
      setFolders(folders.filter(folder => folder.id !== folderToDelete.id));
      handleCloseDeleteModal();
    } catch (error) {
      console.error('フォルダ削除に失敗しました:', error);
      setDeleteFolderError('フォルダの削除に失敗しました。');
    }
  };

  const handleShowCopyModal = (folder) => {
    setFolderToCopy(folder);
    setCopyFolderName(`${folder.folder_name} のコピー`);
    setShowCopyModal(true);
    setCopyFolderError('');
  };

  const handleCloseCopyModal = () => {
    setShowCopyModal(false);
    setFolderToCopy(null);
    setCopyFolderName('');
    setCopyFolderError('');
  };

  const handleCopyFolder = async () => {
    setCopyFolderError('');
    if (!copyFolderName.trim()) {
      setCopyFolderError('コピー先のフォルダ名を入力してください。');
      return;
    }
    if (!folderToCopy) {
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await axios.post(`/api/folders/${folderToCopy.id}/copy`, {
        newFolderName: copyFolderName,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      console.log('フォルダコピー成功:', response.data);
      // フォルダ一覧を再取得して表示を更新
      const fetchFolders = async () => {
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await axios.get('/api/folders', {
            headers: {
              Authorization: `Bearer ${authToken}`,
            }
          });
          setFolders(response.data);
          setLoading(false);
        } catch (error) {
          console.error('フォルダ一覧の取得に失敗しました:', error);
          setError('フォルダ一覧の取得に失敗しました。');
          setLoading(false);
        }
      };
      fetchFolders();
      handleCloseCopyModal();
    } catch (error) {
      console.error('フォルダのコピーに失敗しました:', error);
      setCopyFolderError('フォルダのコピーに失敗しました。');
    }
  };

  const handleStartQuiz = (folderId) => {
    navigate(`/play/start/${folderId}`); // クイズスタート画面への遷移パスを更新
  };

  if (loading) {
    return <div>フォルダ一覧を読み込み中...</div>;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <Container className="mt-5">
      <h1>フォルダ一覧</h1>

      <div className="mb-3">
        <Form.Control
          type="text"
          placeholder="フォルダ名でフィルタ"
          value={filterText}
          onChange={handleFilterChange}
        />
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
              ID {sortConfig.key === 'id' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th onClick={() => requestSort('folder_name')} style={{ cursor: 'pointer' }}>
              フォルダ名 {sortConfig.key === 'folder_name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
            </th>
            <th>問題数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredFolders.map(folder => (
            <tr key={folder.id}>
              <td>{folder.id}</td>
              <td>{folder.folder_name}</td>
              <td>{folder.question_count || 0}</td>
              <td>
                {folder.question_count > 0 && ( // 問題数が 0 より大きい場合のみ Play ボタンを表示
                  <Link to={`/play/start/${folder.id}`} className="btn btn-sm btn-primary me-2">プレイ</Link>
                )}
                <Button as={Link} to={`/folders/${folder.id}/edit`} variant="info" size="sm" className="me-2">編集</Button>
                <Button variant="success" size="sm" className="me-2" onClick={() => handleShowCopyModal(folder)}>コピー</Button>
                <Button variant="danger" size="sm" className="" onClick={() => handleShowDeleteModal(folder)}>削除</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button variant="primary" onClick={handleShowCreateModal}>新しいフォルダを作成</Button>

      {/* 新規フォルダ作成モーダル */}
      <Modal show={showCreateModal} onHide={handleCloseCreateModal}>
        <Modal.Header closeButton>
          <Modal.Title>新しいフォルダを作成</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createFolderError && <div className="text-danger mb-2">{createFolderError}</div>}
          <Form.Group className="mb-3">
            <Form.Label>フォルダ名</Form.Label>
            <Form.Control
              type="text"
              placeholder="新しいフォルダ名を入力"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCreateModal}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleCreateNewFolder}>
            作成
          </Button>
        </Modal.Footer>
      </Modal>

      {/* フォルダ削除確認モーダル */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>フォルダの削除</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteFolderError && <div className="text-danger mb-2">{deleteFolderError}</div>}
          {folderToDelete && (
            <p>
              本当にフォルダ "{folderToDelete.folder_name}" を削除しますか？
              <br />
              <strong>削除すると、このフォルダに含まれるすべての質問 ({folderToDelete.question_count || 0} 件) も同時に削除されます。</strong>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleDeleteFolder}>
            削除
          </Button>
        </Modal.Footer>
      </Modal>

      {/* フォルダコピーモーダル */}
      <Modal show={showCopyModal} onHide={handleCloseCopyModal}>
        <Modal.Header closeButton>
          <Modal.Title>フォルダをコピー</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {copyFolderError && <div className="text-danger mb-2">{copyFolderError}</div>}
          {folderToCopy && (
            <Form.Group className="mb-3">
              <Form.Label>コピー先のフォルダ名</Form.Label>
              <Form.Control
                type="text"
                placeholder={`"${folderToCopy.folder_name}" のコピー`}
                value={copyFolderName}
                onChange={(e) => setCopyFolderName(e.target.value)}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCopyModal}>
            キャンセル
          </Button>
          <Button variant="success" onClick={handleCopyFolder}>
            コピー
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FolderListPage;