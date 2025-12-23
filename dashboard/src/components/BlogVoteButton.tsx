'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';

interface BlogVoteButtonProps {
  articleSlug: string;
  className?: string;
}

interface VoteData {
  upVotes: number;
  downVotes: number;
  userVote: 'up' | 'down' | null;
}

export function BlogVoteButton({ articleSlug, className = '' }: BlogVoteButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [voteData, setVoteData] = useState<VoteData>({
    upVotes: 0,
    downVotes: 0,
    userVote: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchVotes();
    }
  }, [articleSlug, user, authLoading]);

  // Force show buttons after 2 seconds even if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchVotes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/blog-votes?article_slug=${encodeURIComponent(articleSlug)}`);
      if (response.ok) {
        const data = await response.json();
        setVoteData(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching votes:', response.status, errorData);
        // Still show buttons even if fetch fails
        setVoteData({
          upVotes: 0,
          downVotes: 0,
          userVote: null,
        });
      }
    } catch (error) {
      console.error('Error fetching votes:', error);
      // Still show buttons even if fetch fails
      setVoteData({
        upVotes: 0,
        downVotes: 0,
        userVote: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      // Redirect to login - could also show a modal
      return;
    }

    if (isVoting) return;

    setIsVoting(true);

    // Optimistic update
    const previousVote = voteData.userVote;
    const newVote = previousVote === voteType ? null : voteType;
    
    setVoteData((prev) => {
      let newUpVotes = prev.upVotes;
      let newDownVotes = prev.downVotes;

      // Remove previous vote
      if (prev.userVote === 'up') newUpVotes--;
      if (prev.userVote === 'down') newDownVotes--;

      // Add new vote
      if (newVote === 'up') newUpVotes++;
      if (newVote === 'down') newDownVotes++;

      return {
        ...prev,
        upVotes: newUpVotes,
        downVotes: newDownVotes,
        userVote: newVote,
      };
    });

    try {
      const response = await fetch('/api/blog-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_slug: articleSlug,
          vote_type: voteType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update
        setVoteData((prev) => {
          let newUpVotes = prev.upVotes;
          let newDownVotes = prev.downVotes;

          // Remove optimistic vote
          if (newVote === 'up') newUpVotes--;
          if (newVote === 'down') newDownVotes--;

          // Restore previous vote
          if (previousVote === 'up') newUpVotes++;
          if (previousVote === 'down') newDownVotes++;

          return {
            ...prev,
            upVotes: newUpVotes,
            downVotes: newDownVotes,
            userVote: previousVote,
          };
        });
        throw new Error(data.error || 'Failed to vote');
      }

      // Update with server response
      setVoteData({
        upVotes: data.upVotes,
        downVotes: data.downVotes,
        userVote: data.vote_type || null,
      });
    } catch (error) {
      console.error('Error voting:', error);
      // Fetch fresh data on error
      fetchVotes();
    } finally {
      setIsVoting(false);
    }
  };

  // Show loading skeleton while auth is loading (but only for a short time)
  if (authLoading && !showButtons) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="w-6 h-5 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="w-6 h-5 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  const isUpVoted = voteData.userVote === 'up';
  const isDownVoted = voteData.userVote === 'down';

  return (
    <div className={`flex items-center gap-4 ${className}`} data-testid="blog-vote-buttons">
      {/* Thumbs Up */}
      {user ? (
        <button
          onClick={() => handleVote('up')}
          disabled={isVoting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
            isUpVoted
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-transparent'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isUpVoted ? 'Remove thumbs up' : 'Thumbs up'}
        >
          <svg
            className={`w-5 h-5 ${isUpVoted ? 'fill-green-700' : 'fill-none'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span className="text-sm font-semibold">{voteData.upVotes}</span>
        </button>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-transparent transition-all duration-200"
          title="Sign in to vote"
        >
          <svg
            className="w-5 h-5 fill-none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span className="text-sm font-semibold">{voteData.upVotes}</span>
        </Link>
      )}

      {/* Thumbs Down */}
      {user ? (
        <button
          onClick={() => handleVote('down')}
          disabled={isVoting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
            isDownVoted
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-transparent'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isDownVoted ? 'Remove thumbs down' : 'Thumbs down'}
        >
          <svg
            className={`w-5 h-5 ${isDownVoted ? 'fill-red-700' : 'fill-none'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
          <span className="text-sm font-semibold">{voteData.downVotes}</span>
        </button>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-transparent transition-all duration-200"
          title="Sign in to vote"
        >
          <svg
            className="w-5 h-5 fill-none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
          <span className="text-sm font-semibold">{voteData.downVotes}</span>
        </Link>
      )}
    </div>
  );
}

