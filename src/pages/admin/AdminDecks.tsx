import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchDecks, createDeck, updateDeck, deleteDeck } from '../../features/decks/decksSlice';
import { Plus, Pencil, Trash2, Search, Image, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Deck } from '../../types/deck';

interface DeckFormData {
  archetype: string;
  image: string;
  iconImage1: string;
  iconImage2: string;
  attackerImage1: string;
  attackerImage2: string;
}

export default function AdminDecks() {
  const dispatch = useAppDispatch();
  const { decks, isLoading } = useAppSelector((state) => state.decks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<DeckFormData>({
    archetype: '',
    image: '',
    iconImage1: '',
    iconImage2: '',
    attackerImage1: '',
    attackerImage2: ''
  });

  useEffect(() => {
    dispatch(fetchDecks());
  }, [dispatch]);

  const resetForm = () => {
    setFormData({
      archetype: '',
      image: '',
      iconImage1: '',
      iconImage2: '',
      attackerImage1: '',
      attackerImage2: ''
    });
  };

  const handleEditClick = (deck: Deck) => {
    setSelectedDeck(deck);
    setFormData({
      archetype: deck.archetype,
      image: deck.image,
      iconImage1: deck.iconImage1 || '',
      iconImage2: deck.iconImage2 || '',
      attackerImage1: deck.attackerImage1 || '',
      attackerImage2: deck.attackerImage2 || ''
    });
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedDeck(null);
    resetForm();
  };

  const handleAddClose = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הדק?')) {
      await dispatch(deleteDeck(id));
    }
  };

  const handleCreateDeck = async () => {
    if (!formData.archetype.trim()) {
      alert('שם הארכיטיפ הוא שדה חובה');
      return;
    }

    const deckData = {
      archetype: formData.archetype.trim(),
      image: formData.image.trim() || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg',
      ...(formData.iconImage1.trim() && { iconImage1: formData.iconImage1.trim() }),
      ...(formData.iconImage2.trim() && { iconImage2: formData.iconImage2.trim() }),
      ...(formData.attackerImage1.trim() && { attackerImage1: formData.attackerImage1.trim() }),
      ...(formData.attackerImage2.trim() && { attackerImage2: formData.attackerImage2.trim() })
    };

    await dispatch(createDeck(deckData));
    handleAddClose();
  };

  const handleUpdateDeck = async () => {
    if (!selectedDeck || !formData.archetype.trim()) {
      alert('שם הארכיטיפ הוא שדה חובה');
      return;
    }

    const deckData = {
      archetype: formData.archetype.trim(),
      image: formData.image.trim() || selectedDeck.image,
      iconImage1: formData.iconImage1.trim(),
      iconImage2: formData.iconImage2.trim(),
      attackerImage1: formData.attackerImage1.trim(),
      attackerImage2: formData.attackerImage2.trim()
    };

    await dispatch(updateDeck({
      id: selectedDeck.id,
      deckData
    }));
    handleEditClose();
  };

  // Filter decks based on search query
  const filteredDecks = decks.filter((deck) =>
    deck.archetype.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get primary image for display
  const getPrimaryImage = (deck: Deck) => {
    return deck.iconImage1 || deck.image;
  };

  // Helper function to get all available images
  const getAllImages = (deck: Deck) => {
    const images = [];
    if (deck.iconImage1) images.push({ type: 'Icon 1', url: deck.iconImage1 });
    if (deck.iconImage2) images.push({ type: 'Icon 2', url: deck.iconImage2 });
    if (deck.attackerImage1) images.push({ type: 'Attacker 1', url: deck.attackerImage1 });
    if (deck.attackerImage2) images.push({ type: 'Attacker 2', url: deck.attackerImage2 });
    if (!images.length) images.push({ type: 'Default', url: deck.image });
    return images;
  };

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
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תמונה ראשית</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">ארכיטיפ</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תמונות</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredDecks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      לא נמצאו דקים
                    </td>
                  </tr>
                ) : (
                  filteredDecks.map((deck) => (
                    <tr key={deck.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <div className="w-16 h-16 rounded-md overflow-hidden">
                          <img
                            src={getPrimaryImage(deck)}
                            alt={deck.archetype}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{deck.archetype}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Image size={16} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {getAllImages(deck).length} תמונות
                          </span>
                        </div>
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
        <DeckModal
          title="הוספת דק חדש"
          formData={formData}
          setFormData={setFormData}
          onSave={handleCreateDeck}
          onClose={handleAddClose}
          saveButtonText="הוסף דק"
        />
      )}

      {/* Edit Deck Modal */}
      {showEditModal && selectedDeck && (
        <DeckModal
          title="עריכת דק"
          formData={formData}
          setFormData={setFormData}
          onSave={handleUpdateDeck}
          onClose={handleEditClose}
          saveButtonText="שמור שינויים"
        />
      )}
    </div>
  );
}

interface DeckModalProps {
  title: string;
  formData: DeckFormData;
  setFormData: (data: DeckFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saveButtonText: string;
}

function DeckModal({ title, formData, setFormData, onSave, onClose, saveButtonText }: DeckModalProps) {
  const updateField = (field: keyof DeckFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const clearField = (field: keyof DeckFormData) => {
    setFormData({ ...formData, [field]: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Archetype */}
          <div>
            <label className="block text-sm font-medium mb-2">ארכיטיפ *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-input rounded-md"
              placeholder="שם הארכיטיפ"
              value={formData.archetype}
              onChange={(e) => updateField('archetype', e.target.value)}
            />
          </div>

          {/* Legacy Image */}
          <div>
            <label className="block text-sm font-medium mb-2">תמונה ראשית (ברירת מחדל)</label>
            <div className="relative">
              <input
                type="text"
                className="w-full px-3 py-2 border border-input rounded-md pr-10"
                placeholder="קישור לתמונה"
                value={formData.image}
                onChange={(e) => updateField('image', e.target.value)}
              />
              {formData.image && (
                <button
                  type="button"
                  className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => clearField('image')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Icon Images */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">תמונת אייקון 1</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md pr-10"
                  placeholder="קישור לתמונת אייקון"
                  value={formData.iconImage1}
                  onChange={(e) => updateField('iconImage1', e.target.value)}
                />
                {formData.iconImage1 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => clearField('iconImage1')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {formData.iconImage1 && (
                <div className="mt-2">
                  <img
                    src={formData.iconImage1}
                    alt="Icon 1 Preview"
                    className="w-16 h-16 object-cover rounded-md border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">תמונת אייקון 2</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md pr-10"
                  placeholder="קישור לתמונת אייקון"
                  value={formData.iconImage2}
                  onChange={(e) => updateField('iconImage2', e.target.value)}
                />
                {formData.iconImage2 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => clearField('iconImage2')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {formData.iconImage2 && (
                <div className="mt-2">
                  <img
                    src={formData.iconImage2}
                    alt="Icon 2 Preview"
                    className="w-16 h-16 object-cover rounded-md border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Attacker Images */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">תמונת תוקף ראשי 1</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md pr-10"
                  placeholder="קישור לתמונת קלף תוקף"
                  value={formData.attackerImage1}
                  onChange={(e) => updateField('attackerImage1', e.target.value)}
                />
                {formData.attackerImage1 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => clearField('attackerImage1')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {formData.attackerImage1 && (
                <div className="mt-2">
                  <img
                    src={formData.attackerImage1}
                    alt="Attacker 1 Preview"
                    className="w-16 h-20 object-cover rounded-md border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">תמונת תוקף ראשי 2</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md pr-10"
                  placeholder="קישור לתמונת קלף תוקף"
                  value={formData.attackerImage2}
                  onChange={(e) => updateField('attackerImage2', e.target.value)}
                />
                {formData.attackerImage2 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => clearField('attackerImage2')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {formData.attackerImage2 && (
                <div className="mt-2">
                  <img
                    src={formData.attackerImage2}
                    alt="Attacker 2 Preview"
                    className="w-16 h-20 object-cover rounded-md border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={onSave}>
              {saveButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}