import { Card } from '../components/ui/Card';
import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import {contentPagesService} from '../services/contentPages';
import type {ContentPage as Page} from '../types/contentPage';
import {PageHero} from '../components/ui/PageHero';
import {MediaGallery} from '../components/media/MediaGallery';
import SafeHtml from '../components/content/SafeHtml';
import {requestError} from '../utils/requestError';
export default function ContentPage(){
 const {id=''}=useParams();const [page,setPage]=useState<Page|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setPage(null);setError('');contentPagesService.get(id).then(p=>{if(active)setPage(p)}).catch(e=>{if(active)setError(requestError(e))});return()=>{active=false};},[id]);
 return <div><PageHero title={page?.title||'עמוד תוכן'} subtitle={page?.subtitle}/><div className="container py-8 space-y-5">
 {error?<p role="alert">{error}</p>:!page?<p role="status">טוען תוכן...</p>:<><MediaGallery carousel items={page.mediaItems||[]}/><Card variant="public" className="p-5 sm:p-8" role="article" aria-label="תוכן העמוד"><SafeHtml html={page.bodyHtml||''}/></Card></>}</div></div>;
}
