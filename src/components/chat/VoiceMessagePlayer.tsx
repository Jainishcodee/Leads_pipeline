import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/voiceRecording';

interface VoiceMessagePlayerProps {
  voiceUrl: string;
  duration: number;
  isSelf?: boolean;
}

export function VoiceMessagePlayer({ voiceUrl, duration, isSelf = false }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceUrl);
      
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audioRef.current.addEventListener('loadstart', () => {
        setIsLoading(true);
      });

      audioRef.current.addEventListener('canplay', () => {
        setIsLoading(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [voiceUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg min-w-[200px]',
      isSelf ? 'bg-mocha-100/30' : 'bg-muted/50'
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={togglePlayPause}
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative w-full h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-mocha-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
        </div>
      </div>
    </div>
  );
}
