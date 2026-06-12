import { effectiveCodeLanguage } from '../../lib/codeLanguage';
import { getDailyQuestion } from '../../lib/daily';
import QuestionView from '../../components/QuestionView';

type Props = {
  step: number;
  onSubmit: (isCorrect: boolean) => void;
};

export default function DailyQuestion({ step, onSubmit }: Props) {
  const question = getDailyQuestion(step - 1, new Date(), effectiveCodeLanguage());

  if (!question) {
    return <p>문항을 찾을 수 없어요.</p>;
  }

  return <QuestionView key={question.id} question={question} onSubmit={onSubmit} />;
}
