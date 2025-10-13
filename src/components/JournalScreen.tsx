import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  Download,
  Filter,
  BookOpen,
  Flame
} from 'lucide-react';
import { formatDate, truncateText } from '../utils/helpers';
import { validateJournalEntry, sanitizeInput } from '../utils/validation';

export const JournalScreen: React.FC = () => {
  const { journalEntries, addJournalEntry, deleteJournalEntry, streaks } = useApp();
  const [view, setView] = useState<'list' | 'new' | 'view'>('list');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('content');
  const [errors, setErrors] = useState<{title?: string; content?: string}>({});

  const moods = [
    { value: 'joyful', emoji: '😄', label: 'Joyful', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'peaceful', emoji: '😌', label: 'Peaceful', color: 'bg-blue-100 text-blue-700' },
    { value: 'content', emoji: '🙂', label: 'Content', color: 'bg-green-100 text-green-700' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
    { value: 'anxious', emoji: '😰', label: 'Anxious', color: 'bg-orange-100 text-orange-700' },
    { value: 'sad', emoji: '😔', label: 'Sad', color: 'bg-purple-100 text-purple-700' },
  ];

  const suggestedTags = ['gratitude', 'reflection', 'goals', 'mindfulness', 'work', 'family', 'health', 'creativity'];

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    setErrors({});
    
    const validation = validateJournalEntry(title, content);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const sanitizedTitle = sanitizeInput(title);
    const sanitizedContent = sanitizeInput(content);

    addJournalEntry({
      date: new Date().toISOString().split('T')[0],
      title: sanitizedTitle,
      content: sanitizedContent,
      mood: selectedMood,
      tags: selectedTags,
    });

    // Reset form
    setTitle('');
    setContent('');
    setSelectedTags([]);
    setSelectedMood('content');
    setView('list');
  };

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getMoodEmoji = (mood: string) => {
    return moods.find(m => m.value === mood)?.emoji || '🙂';
  };

  // List View
  if (view === 'list') {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
              Journal
            </h1>
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-[#667eea] to-[#f093fb] rounded-full">
              <Flame className="text-white" size={14} />
              <span className="text-white text-sm font-semibold">{streaks.journal}</span>
            </div>
          </div>
          
          <Button
            onClick={() => setView('new')}
            className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl shadow-lg"
          >
            <Plus size={20} />
          </Button>
        </div>

        <div className="text-center p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-2xl">
          <p className="text-[#667eea] font-semibold">
            💭 Your sacred space for thoughts and reflections
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search your journal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-white border-gray-200 rounded-2xl h-12"
          />
        </div>

        {/* Journal Entries List */}
        <div className="space-y-4">
          {filteredEntries.length === 0 && searchQuery === '' && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] rounded-3xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-[#667eea]" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Start Your Journey</h3>
              <p className="text-gray-600 mb-6">Your first journal entry awaits. Share what's on your heart.</p>
              <Button
                onClick={() => setView('new')}
                className="bg-gradient-to-r from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl px-6"
              >
                <Plus size={16} className="mr-2" />
                Write First Entry
              </Button>
            </div>
          )}

          {filteredEntries.length === 0 && searchQuery !== '' && (
            <div className="text-center py-12">
              <p className="text-gray-500">No entries found matching "{searchQuery}"</p>
            </div>
          )}

          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="p-5 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                      <div className="text-xl">{getMoodEmoji(entry.mood)}</div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                      {truncateText(entry.content, 100)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteJournalEntry(entry.id)}
                    className="text-gray-400 hover:text-red-500 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs border-[#667eea]/30 text-[#667eea]">
                        {tag}
                      </Badge>
                    ))}
                    {entry.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                        +{entry.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // New Entry View
  if (view === 'new') {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setView('list')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">New Entry</h1>
          <div className="w-10"></div>
        </div>

        <div className="p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-2xl">
          <p className="text-[#667eea] font-semibold text-center">
            💭 What's on your mind today?
          </p>
        </div>

        <div className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Input
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors({...errors, title: undefined});
              }}
              className={`bg-white border-0 rounded-2xl h-12 shadow-lg text-lg font-medium placeholder:text-gray-400 ${
                errors.title ? 'border-2 border-red-400' : ''
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-sm ml-2">{errors.title}</p>
            )}
          </div>
          
          {/* Mood Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">How are you feeling?</label>
            <div className="grid grid-cols-3 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedMood === mood.value
                      ? 'border-[#667eea] bg-[#e6f3ff] scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{mood.emoji}</div>
                  <div className="text-xs font-medium text-gray-700">{mood.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts, feelings, or experiences... ✨"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setErrors({...errors, content: undefined});
              }}
              className={`min-h-80 bg-white border-0 rounded-3xl resize-none text-base p-6 shadow-lg placeholder:text-gray-400 ${
                errors.content ? 'border-2 border-red-400' : ''
              }`}
            />
            {errors.content && (
              <p className="text-red-500 text-sm ml-2">{errors.content}</p>
            )}
            <div className="text-right text-xs text-gray-500">
              {content.length} / 10,000 characters
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Add tags (optional)</label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-[#667eea] text-white px-3 py-1 cursor-pointer hover:bg-[#5a67d8]"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTags
                .filter(tag => !selectedTags.includes(tag))
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-[#e6f3ff] border-[#667eea]/30 text-[#667eea]"
                    onClick={() => handleAddTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-[#667eea] to-[#5a67d8] hover:from-[#5a67d8] hover:to-[#4c51bf] text-white rounded-2xl h-14 shadow-lg font-semibold text-lg"
          >
            <BookOpen size={20} className="mr-2" />
            Save Entry (+1 Streak)
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
