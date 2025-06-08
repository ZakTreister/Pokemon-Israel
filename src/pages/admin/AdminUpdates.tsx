import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUpdates } from '../../features/updates/updatesSlice';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Update } from '../../types/update';

export default function AdminUpdates() {
  const dispatch = useAppDispatch();
  const { updates, isLoading } = useAppSelector((state) => state.updates);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    dispatch(fetchUpdates());
  }, [dispatch]);

  // Sort updates by date (newest first)
  const sortedUpdates = [...updates].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleEditClick = (update: Update) => {
    setSelectedUpdate(update);
    setEditTitle(update.title);
    setEditContent(update.content);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedUpdate(null);
    setEditTitle('');
    setEditContent('');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול עדכונים</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="ml-1" />
          <span>עדכון חדש</span>
        </Button>
      </div>

      {/* Updates List */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען עדכונים...</div>
      ) : (
        <>
          {sortedUpdates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-4">לא נמצאו עדכונים</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedUpdates.map((update) => (
                <Card key={update.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{update.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <Calendar size={14} />
                          <span>
                            {formatDistanceToNow(new Date(update.date), { 
                              addSuffix: true, 
                              locale: he 
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{update.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(update)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Update Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">הוספת עדכון חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">כותרת</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="כותרת העדכון"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תוכן</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md"
                  rows={4}
                  placeholder="תוכן העדכון"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => {
                    // Handle update creation
                    setShowAddModal(false);
                  }}
                >
                  הוסף עדכון
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Update Modal */}
      {showEditModal && selectedUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">עריכת עדכון</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">כותרת</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="כותרת העדכון"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תוכן</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md"
                  rows={4}
                  placeholder="תוכן העדכון"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handleEditClose}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => {
                    // Handle update edit
                    handleEditClose();
                  }}
                >
                  שמור שינויים
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}