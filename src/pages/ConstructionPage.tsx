import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import Button from '../components/ui/Button';
export default function ConstructionPage({ title }: { title: string }) {
  return (
    <div className="container py-16">
      <div className="cs-public-card max-w-2xl mx-auto p-8 sm:p-14 text-center border-t-4 border-t-gold">
        <Hammer className="h-14 w-14 mx-auto mb-6 text-blue-500" />
        <p className="text-blue-500 font-bold mb-3">בהקמה</p>
        <h1 className="text-4xl font-extrabold mb-5">{title}</h1>
        <p className="text-muted-foreground mb-8">
          העמוד נמצא בהכנה. מידע נוסף יפורסם כאן בהמשך.
        </p>
        <Button asChild variant="cta">
          <Link to="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </div>
  );
}
