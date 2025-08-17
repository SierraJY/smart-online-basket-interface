#!/usr/bin/env python3
"""
MLflow 실험 관리 및 모델 비교 스크립트

이 스크립트는 MLflow를 통해:
1. 실험 결과 비교
2. 최고 성능 모델 선택
3. 모델 배포 관리
4. 실험 메타데이터 분석
을 수행합니다.
"""

import os
import sys
import json
import pandas as pd
import mlflow
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import argparse
from pathlib import Path

# MLflow 유틸리티 import (상대 경로로 수정)
from .mlflow_utils import get_mlflow_manager

class MLflowExperimentManager:
    """MLflow 실험 관리 클래스"""
    
    def __init__(self, experiment_name: str = "mlops_project"):
        self.mlflow_manager = get_mlflow_manager(experiment_name)
        self.experiment_name = experiment_name
        
    def list_experiments(self) -> List[Dict]:
        """모든 실험 목록 조회"""
        experiments = mlflow.search_experiments()
        return [
            {
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "artifact_location": exp.artifact_location,
                "lifecycle_stage": exp.lifecycle_stage
            }
            for exp in experiments
        ]
    
    def list_runs(self, 
                  experiment_name: Optional[str] = None,
                  max_results: int = 100,
                  filter_string: Optional[str] = None) -> List[Dict]:
        """실험 실행 목록 조회"""
        if experiment_name:
            mlflow.set_experiment(experiment_name)
        
        runs = mlflow.search_runs(
            experiment_names=[experiment_name or self.experiment_name],
            max_results=max_results,
            filter_string=filter_string
        )
        
        if runs.empty:
            return []
        
        # 실행 정보 추출
        run_list = []
        for _, run in runs.iterrows():
            run_info = {
                "run_id": run["run_id"],
                "experiment_id": run["experiment_id"],
                "status": run["status"],
                "start_time": run["start_time"],
                "end_time": run["end_time"],
                "artifact_uri": run["artifact_uri"],
                "lifecycle_stage": run["lifecycle_stage"]
            }
            
            # 파라미터 추가
            params = {}
            for col in run.columns:
                if col.startswith("params."):
                    param_name = col.replace("params.", "")
                    params[param_name] = run[col]
            run_info["parameters"] = params
            
            # 메트릭 추가
            metrics = {}
            for col in run.columns:
                if col.startswith("metrics."):
                    metric_name = col.replace("metrics.", "")
                    metrics[metric_name] = run[col]
            run_info["metrics"] = metrics
            
            # 태그 추가
            tags = {}
            for col in run.columns:
                if col.startswith("tags."):
                    tag_name = col.replace("tags.", "")
                    tags[tag_name] = run[col]
            run_info["tags"] = tags
            
            run_list.append(run_info)
        
        return run_list
    
    def get_best_run(self, 
                     metric: str = "final_accuracy",
                     experiment_name: Optional[str] = None,
                     filter_string: Optional[str] = None) -> Optional[Dict]:
        """최고 성능 실행 조회"""
        runs = self.list_runs(experiment_name, filter_string=filter_string)
        
        if not runs:
            return None
        
        # 메트릭 기준으로 정렬
        valid_runs = [run for run in runs if metric in run["metrics"]]
        if not valid_runs:
            return None
        
        best_run = max(valid_runs, key=lambda x: x["metrics"][metric])
        return best_run
    
    def compare_runs(self, 
                    run_ids: List[str],
                    metrics: List[str] = None) -> pd.DataFrame:
        """여러 실행 결과 비교"""
        if metrics is None:
            metrics = ["final_accuracy", "final_loss"]
        
        comparison_data = []
        
        for run_id in run_ids:
            run = mlflow.get_run(run_id)
            run_data = {
                "run_id": run_id,
                "experiment_id": run.info.experiment_id,
                "status": run.info.status,
                "start_time": run.info.start_time,
                "end_time": run.info.end_time
            }
            
            # 파라미터 추가
            for key, value in run.data.params.items():
                run_data[f"param_{key}"] = value
            
            # 메트릭 추가
            for metric in metrics:
                if metric in run.data.metrics:
                    run_data[metric] = run.data.metrics[metric]
                else:
                    run_data[metric] = None
            
            comparison_data.append(run_data)
        
        return pd.DataFrame(comparison_data)
    
    def get_model_artifacts(self, run_id: str) -> List[str]:
        """실행의 모델 아티팩트 목록 조회"""
        run = mlflow.get_run(run_id)
        artifact_uri = run.info.artifact_uri
        
        # 아티팩트 목록 조회
        artifacts = mlflow.artifacts.list_artifacts(run_id)
        return [artifact.path for artifact in artifacts]
    
    def download_model(self, run_id: str, artifact_path: str = "model", local_path: str = None) -> str:
        """모델 다운로드"""
        if local_path is None:
            local_path = f"/tmp/mlflow_model_{run_id}"
        
        mlflow.artifacts.download_artifacts(
            run_id=run_id,
            artifact_path=artifact_path,
            dst_path=local_path
        )
        
        print(f"[MLflow] Model downloaded to: {local_path}")
        return local_path
    
    def register_model(self, 
                      run_id: str, 
                      model_name: str,
                      artifact_path: str = "model") -> str:
        """모델을 MLflow 모델 레지스트리에 등록"""
        model_uri = f"runs:/{run_id}/{artifact_path}"
        
        try:
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=model_name
            )
            print(f"[MLflow] Model registered: {model_name} v{model_version.version}")
            return model_version.name
        except Exception as e:
            print(f"[MLflow] Model registration failed: {e}")
            return None
    
    def deploy_model(self, 
                    model_name: str, 
                    version: Optional[int] = None,
                    stage: str = "Production") -> bool:
        """모델을 특정 스테이지로 배포"""
        try:
            if version:
                mlflow.tracking.MlflowClient().transition_model_version_stage(
                    name=model_name,
                    version=version,
                    stage=stage
                )
            else:
                # 최신 버전을 배포
                client = mlflow.tracking.MlflowClient()
                latest_version = client.get_latest_versions(model_name)[-1]
                client.transition_model_version_stage(
                    name=model_name,
                    version=latest_version.version,
                    stage=stage
                )
            
            print(f"[MLflow] Model deployed: {model_name} -> {stage}")
            return True
        except Exception as e:
            print(f"[MLflow] Model deployment failed: {e}")
            return False
    
    def generate_experiment_report(self, 
                                  experiment_name: Optional[str] = None,
                                  output_path: str = None) -> str:
        """실험 결과 리포트 생성"""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"/tmp/mlflow_report_{timestamp}.html"
        
        runs = self.list_runs(experiment_name)
        
        if not runs:
            print("[MLflow] No runs found for report generation")
            return None
        
        # HTML 리포트 생성
        html_content = self._generate_html_report(runs)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"[MLflow] Report generated: {output_path}")
        return output_path
    
    def _generate_html_report(self, runs: List[Dict]) -> str:
        """HTML 리포트 내용 생성"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>MLflow Experiment Report</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .run-card {{ border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }}
                .metrics {{ display: flex; gap: 20px; }}
                .metric {{ background-color: #e8f4fd; padding: 10px; border-radius: 3px; }}
                .parameters {{ background-color: #f9f9f9; padding: 10px; border-radius: 3px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MLflow Experiment Report</h1>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Total Runs: {len(runs)}</p>
            </div>
        """
        
        for run in runs:
            html += f"""
            <div class="run-card">
                <h3>Run ID: {run['run_id']}</h3>
                <p><strong>Status:</strong> {run['status']}</p>
                <p><strong>Start Time:</strong> {run['start_time']}</p>
                <p><strong>End Time:</strong> {run['end_time']}</p>
                
                <div class="metrics">
                    <h4>Metrics:</h4>
                    {''.join([f'<div class="metric"><strong>{k}:</strong> {v:.4f}</div>' for k, v in run['metrics'].items()])}
                </div>
                
                <div class="parameters">
                    <h4>Parameters:</h4>
                    {''.join([f'<div><strong>{k}:</strong> {v}</div>' for k, v in run['parameters'].items()])}
                </div>
            </div>
            """
        
        html += """
        </body>
        </html>
        """
        
        return html

def main():
    """메인 실행 함수"""
    parser = argparse.ArgumentParser(description="MLflow 실험 관리 도구")
    parser.add_argument("--action", 
                       choices=["list_experiments", "list_runs", "best_run", "compare", "download", "register", "deploy", "report"],
                       required=True,
                       help="수행할 작업")
    parser.add_argument("--experiment", default="mlops_project", help="실험 이름")
    parser.add_argument("--run_ids", nargs="+", help="실행 ID 목록")
    parser.add_argument("--metric", default="final_accuracy", help="최고 성능 기준 메트릭")
    parser.add_argument("--model_name", help="모델 이름")
    parser.add_argument("--output_path", help="출력 경로")
    
    args = parser.parse_args()
    
    # MLflow 매니저 초기화
    manager = MLflowExperimentManager(args.experiment)
    
    if args.action == "list_experiments":
        experiments = manager.list_experiments()
        print(f"\n=== Experiments ===")
        for exp in experiments:
            print(f"ID: {exp['experiment_id']}, Name: {exp['name']}")
    
    elif args.action == "list_runs":
        runs = manager.list_runs(args.experiment)
        print(f"\n=== Runs for {args.experiment} ===")
        for run in runs:
            print(f"Run ID: {run['run_id']}, Status: {run['status']}")
            if 'final_accuracy' in run['metrics']:
                print(f"  Accuracy: {run['metrics']['final_accuracy']:.4f}")
    
    elif args.action == "best_run":
        best_run = manager.get_best_run(args.metric, args.experiment)
        if best_run:
            print(f"\n=== Best Run by {args.metric} ===")
            print(f"Run ID: {best_run['run_id']}")
            print(f"Metric Value: {best_run['metrics'].get(args.metric, 'N/A')}")
        else:
            print("No runs found")
    
    elif args.action == "compare":
        if not args.run_ids:
            print("Error: --run_ids required for compare action")
            return
        comparison = manager.compare_runs(args.run_ids)
        print(f"\n=== Run Comparison ===")
        print(comparison.to_string(index=False))
    
    elif args.action == "download":
        if not args.run_ids:
            print("Error: --run_ids required for download action")
            return
        for run_id in args.run_ids:
            local_path = manager.download_model(run_id)
            print(f"Downloaded to: {local_path}")
    
    elif args.action == "register":
        if not args.run_ids or not args.model_name:
            print("Error: --run_ids and --model_name required for register action")
            return
        for run_id in args.run_ids:
            model_name = manager.register_model(run_id, args.model_name)
            if model_name:
                print(f"Registered: {model_name}")
    
    elif args.action == "deploy":
        if not args.model_name:
            print("Error: --model_name required for deploy action")
            return
        success = manager.deploy_model(args.model_name)
        if success:
            print("Model deployed successfully")
    
    elif args.action == "report":
        output_path = args.output_path or f"/tmp/mlflow_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        report_path = manager.generate_experiment_report(args.experiment, output_path)
        if report_path:
            print(f"Report generated: {report_path}")

if __name__ == "__main__":
    main()
