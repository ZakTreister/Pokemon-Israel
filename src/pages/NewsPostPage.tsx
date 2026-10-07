import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import updatesService from '../features/updates/updatesService';
import type { Update } from '../types/update';
import { requestError } from '../utils/requestError';
export default function NewsPostPage() {
  const { id = '' } = useParams();
  const [post, setPost] = useState<Update | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setPost(null);
    setError('');
    updatesService
      .getUpdate(id)
      .then((data) => {
        if (active) setPost(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <div className="container py-12">
      <Link to="/news" className="text-blue-500 font-bold">
        → לכל חדשות הליגה
      </Link>
      {error && (
        <p role="alert" className="mt-6">
          {error}
        </p>
      )}
      {post && (
        <article className="cs-public-card p-6 sm:p-10 mt-6 max-w-3xl mx-auto">
          <p className="text-sm text-blue-500 font-bold">
            {new Date(post.date).toLocaleDateString('he-IL')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold my-6">
            {post.title}
          </h1>
          <div className="whitespace-pre-wrap break-words leading-8">
            {post.content.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) =>
              /^https?:\/\//.test(part) ? (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline break-all"
                >
                  {part}
                </a>
              ) : (
                part
              ),
            )}
          </div>
        </article>
      )}
      {!post && !error && <p className="mt-6">טוען עדכון...</p>}
    </div>
  );
}
