"use client"
import React from 'react';
import ScenarioMiniMap from './ScenarioMiniMap';
export default function IncidentScenario({ currentStep }: { currentStep: number }) {
  return <ScenarioMiniMap currentStep={currentStep} />;
}
