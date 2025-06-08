import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchDecks, createDeck, updateDeck, deleteDeck } from '../../features/decks/decksSlice';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Deck } from '../../types/deck';

export default function AdminDecks() {
  const dispatch = useAppDispatch();
  const { decks, isLoading } = useAppSelector((state) => state.decks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [editArchetype, setEditArchetype] = useState('');
  const [editImage, setEditImage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchDecks());
  }, [dispatch]);

  const handleEditClick = (deck: Deck) => {
    setSelectedDeck(deck);
    setEditArchetype(deck.archetype);
    setEditImage(deck.image);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedDeck(null);
    setEditArchetype('');
    setEditImage('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הדק?')) {
      await dispatch(deleteDeck(id));
    }
  };

  // Filter decks based on search query
  const filteredDecks = decks.filter((deck) =>
    deck.archetype.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול דקים</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="ml-1" />
          <span>דק חדש</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="חפש לפי ארכיטיפ..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Decks Table */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען דקים...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תמונה</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">ארכיטיפ</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredDecks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      לא נמצאו דקים
                    </td>
                  </tr>
                ) : (
                  filteredDecks.map((deck) => (
                    <tr key={deck.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <div className="w-16 h-16 rounded-md overflow-hidden">
                          <img
                            src={deck.image}
                            alt={deck.archetype}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{deck.archetype}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditClick(deck)}
                          >
                            <Pencil size={16} className="ml-1" />
                            <span>ערוך</span>
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(deck.id)}
                          >
                            <Trash2 size={16} className="ml-1" />
                            <span>מחק</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Deck Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">הוספת דק חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ארכיטיפ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="שם הארכיטיפ"
                  value={editArchetype}
                  onChange={(e) => setEditArchetype(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תמונה</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="קישור לתמונה"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditArchetype('');
                    setEditImage('');
                  }}
                >
                  ביטול
                </Button>
                <Button
                  onClick={async () => {
                    await dispatch(createDeck({ archetype: editArchetype, image: editImage }));
                    setShowAddModal(false);
                    setEditArchetype('');
                    setEditImage('');
                  }}
                >
                  הוסף דק
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deck Modal */}
      {showEditModal && selectedDeck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">עריכת דק</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ארכיטיפ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="שם הארכיטיפ"
                  value={editArchetype}
                  onChange={(e) => setEditArchetype(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תמונה</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="קישור לתמונה"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
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
                  onClick={async () => {
                    if (selectedDeck) {
                      await dispatch(updateDeck({
                        id: selectedDeck.id,
                        deckData: { archetype: editArchetype, image: editImage }
                      }));
                      handleEditClose();
                    }
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