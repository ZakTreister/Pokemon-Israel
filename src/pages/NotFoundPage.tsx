import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="container py-16 min-h-[calc(100vh-20rem)]">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">הדף לא נמצא</h2>
        <p className="text-muted-foreground mb-8">
          נראה שהדף שחיפשת לא קיים. אולי כתובת ה-URL שגויה או שהדף הוסר.
        </p>
        <Link to="/">
          <Button>חזרה לדף הבית</Button>
        </Link>
      </div>
    </div>
  );
}