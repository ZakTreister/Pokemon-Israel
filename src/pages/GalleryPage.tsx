import {useEffect,useState} from 'react';
import api from '../services/api';
import type {Gallery} from '../types/gallery';
import {PageHero} from '../components/ui/PageHero';
import {MediaGallery} from '../components/media/MediaGallery';
import {requestError} from '../utils/requestError';
export default function GalleryPage(){const [gallery,setGallery]=useState<Gallery|null>(null),[error,setError]=useState('');useEffect(()=>{api.get<Gallery>('/api/gallery').then(r=>setGallery(r.data)).catch(e=>setError(requestError(e)));},[]);return <><PageHero title={gallery?.title||'גלריה'} subtitle={gallery?.subtitle}/><div className="container py-8">{error?<p role="alert">{error}</p>:!gallery?<p role="status">טוען גלריה...</p>:gallery.mediaItems.length?<MediaGallery items={gallery.mediaItems}/>:<p>תמונות וסרטונים יופיעו כאן לאחר פרסומם.</p>}</div></>}
