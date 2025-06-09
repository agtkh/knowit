// frontend/src/pages/FolderListPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Form, Button, Modal, Alert } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';

const FolderListPage = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // フィルタリング用ステート
  const [filterText, setFilterText] = useState('');
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false); // フィルタリングリセット用

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

  const navigate = useNavigate();

  // フォルダデータのフェッチ関数
  const fetchFolders = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      const response = await axios.get('/api/folders', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setFolders(response.data);
    } catch (error) {
      console.error('フォルダ一覧の取得に失敗しました:', error);
      setError('フォルダ一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  // DataTable のフィルタリングロジック
  const filteredItems = useMemo(() => {
    if (!filterText) return folders;
    return folders.filter(
      (folder) =>
        folder.folder_name &&
        folder.folder_name.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [folders, filterText]);

  // フィルタリング入力の変更ハンドラ
  const handleFilterChange = (event) => {
    if (event.target.value) {
      setFilterText(event.target.value);
    } else {
      setFilterText('');
      setResetPaginationToggle(!resetPaginationToggle); // フィルタリング解除時にページネーションをリセット
    }
  };

  // フォルダ作成モーダル関連
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
      // 新しいフォルダを直接 state に追加
      setFolders((prevFolders) => [...prevFolders, { id: response.data.id, folder_name: response.data.folder_name, question_count: 0 }]);
      handleCloseCreateModal();
    } catch (error) {
      console.error('フォルダ作成に失敗しました:', error);
      setCreateFolderError('フォルダの作成に失敗しました。');
    }
  };

  // フォルダ削除モーダル関連
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
      setFolders((prevFolders) => prevFolders.filter((folder) => folder.id !== folderToDelete.id));
      handleCloseDeleteModal();
    } catch (error) {
      console.error('フォルダ削除に失敗しました:', error);
      setDeleteFolderError('フォルダの削除に失敗しました。');
    }
  };

  // フォルダコピーモーダル関連
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
      // コピー後、フォルダ一覧を再取得して表示を更新
      await fetchFolders();
      handleCloseCopyModal();
    } catch (error) {
      console.error('フォルダのコピーに失敗しました:', error);
      setCopyFolderError('フォルダのコピーに失敗しました。');
    }
  };

  // DataTable のカラム定義
  const columns = useMemo(
    () => [
      // {
      //   name: 'ID',
      //   selector: (row) => row.id,
      //   sortable: true,
      //   width: '80px',
      // },
      {
        name: 'フォルダ名',
        selector: (row) => row.folder_name,
        sortable: true,
      },
      {
        name: '問題数',
        selector: (row) => row.question_count || 0,
        sortable: true,
        width: '100px',
      },
      {
        name: '操作',
        cell: (row) => (
          <>
            {row.question_count > 0 && (
              <Link to={`/play/start/${row.id}`} className="btn btn-sm btn-primary me-2">
                プレイ
              </Link>
            )}
            <Button as={Link} to={`/folders/${row.id}/edit`} variant="info" size="sm" className="me-2">
              編集
            </Button>
            <Button variant="success" size="sm" className="me-2" onClick={() => handleShowCopyModal(row)}>
              コピー
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(row)}>
              削除
            </Button>
          </>
        ),
        ignoreRowClick: true, // 行クリックイベントがこのセルには適用されないようにする
        width: '300px', // ボタンの幅に合わせて調整
      },
    ],
    [], // 依存配列が空なので、一度だけ生成される
  );

  // カスタムスタイル (オプション)
  const customStyles = {
    headCells: {
      style: {
        fontSize: '1rem', // ヘッダーのフォントサイズ
        fontWeight: 'bold',
        backgroundColor: '#f8f9fa', // ヘッダーの背景色
      },
    },
    cells: {
      style: {
        fontSize: '0.9rem', // セルのフォントサイズ
      },
    },
  };

  if (loading) {
    return <Alert variant="info">フォルダ一覧を読み込み中...</Alert>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Container className="mt-5">
      <h1>フォルダ一覧</h1>

      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Form.Control
          type="text"
          placeholder="フォルダ名でフィルタ"
          value={filterText}
          onChange={handleFilterChange}
          className="me-2"
          style={{ maxWidth: '300px' }}
        />
        <Button variant="primary" onClick={handleShowCreateModal}>
          新しいフォルダを作成
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        pagination
        paginationResetDefaultPage={resetPaginationToggle}
        highlightOnHover
        pointerOnHover
        striped
        responsive
        noDataComponent="表示するフォルダがありません。"
        customStyles={customStyles}
      />

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
              本当にフォルダ "<strong>{folderToDelete.folder_name}</strong>" を削除しますか？
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