import { FC, useEffect } from 'react';
import { Slider } from '../ReusableComponents/Slider';
interface Props {
  responseSliderState: number;
  label: string;
  onResponseTokenRatioChange: (tokenRatio: number) => void;
}

export const ResponseTokensSlider: FC<Props> = ({
  responseSliderState, label, onResponseTokenRatioChange,
}) => {

  useEffect(() => {
    onResponseTokenRatioChange(responseSliderState)
  },[responseSliderState]);

  return (

    <Slider
      label={label}
      description={"Higher values will allow, but do not guarantee, longer answers."}
      defaultState={ responseSliderState }
      onChange={(newValue) => onResponseTokenRatioChange(newValue)}
      labels={["Concise", "Average", "Verbose"]}
      max={6}
      />

  );
};
