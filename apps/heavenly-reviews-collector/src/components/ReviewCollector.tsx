import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sui-chrome-extensions/ui';

export default function ReviewCollector() {
  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <Card className='w-100 border-0 shadow-none'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg'>H Reviews Collector</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p className='text-sm text-muted-foreground'>
          レビュー収集とデータ管理を行うには、オプション画面を開いてください。
        </p>
        <Button onClick={handleOpenOptions} className='w-full'>
          オプションを開く
        </Button>
      </CardContent>
    </Card>
  );
}
