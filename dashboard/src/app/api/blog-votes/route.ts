import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-utils';

/**
 * GET /api/blog-votes?article_slug=xxx
 * Get vote counts and user's vote for an article
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleSlug = searchParams.get('article_slug');

    if (!articleSlug) {
      return NextResponse.json(
        { error: 'article_slug parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const user = await getCurrentUser();

    // Get vote counts
    const { data: votes, error: votesError } = await supabase
      .from('blog_votes')
      .select('vote_type')
      .eq('article_slug', articleSlug);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      );
    }

    const upVotes = votes?.filter(v => v.vote_type === 'up').length || 0;
    const downVotes = votes?.filter(v => v.vote_type === 'down').length || 0;

    // Get user's vote if logged in
    let userVote: 'up' | 'down' | null = null;
    if (user) {
      const { data: userVoteData } = await supabase
        .from('blog_votes')
        .select('vote_type')
        .eq('article_slug', articleSlug)
        .eq('user_id', user.id)
        .single();

      if (userVoteData) {
        userVote = userVoteData.vote_type as 'up' | 'down';
      }
    }

    return NextResponse.json({
      upVotes,
      downVotes,
      userVote,
    });
  } catch (error) {
    console.error('Blog votes GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog-votes
 * Create or update a vote for an article
 * Body: { article_slug: string, vote_type: 'up' | 'down' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { article_slug, vote_type } = body;

    if (!article_slug || !vote_type) {
      return NextResponse.json(
        { error: 'article_slug and vote_type are required' },
        { status: 400 }
      );
    }

    if (vote_type !== 'up' && vote_type !== 'down') {
      return NextResponse.json(
        { error: 'vote_type must be "up" or "down"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('blog_votes')
      .select('id, vote_type')
      .eq('article_slug', article_slug)
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingVote) {
      // If user already voted the same way, remove the vote (toggle off)
      if (existingVote.vote_type === vote_type) {
        const { error: deleteError } = await supabase
          .from('blog_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Error deleting vote:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'removed',
          vote_type: null,
        });
      } else {
        // Update to different vote type
        const { data, error: updateError } = await supabase
          .from('blog_votes')
          .update({ vote_type })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }

        result = data;
      }
    } else {
      // Create new vote
      const { data, error: insertError } = await supabase
        .from('blog_votes')
        .insert({
          user_id: user.id,
          article_slug,
          vote_type,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting vote:', insertError);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }

      result = data;
    }

    // Get updated vote counts
    const { data: votes } = await supabase
      .from('blog_votes')
      .select('vote_type')
      .eq('article_slug', article_slug);

    const upVotes = votes?.filter(v => v.vote_type === 'up').length || 0;
    const downVotes = votes?.filter(v => v.vote_type === 'down').length || 0;

    return NextResponse.json({
      success: true,
      action: existingVote ? 'updated' : 'created',
      vote_type: result.vote_type,
      upVotes,
      downVotes,
    });
  } catch (error) {
    console.error('Blog votes POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






