# OpenVINO Model Server converter extension for FuseML workflows

## Overview

The OVMS converter workflow step can be used to convert input ML models to the IR (Intermediate Representation) format supported by the [OpenVINO Model Server](https://docs.openvino.ai/latest/openvino_docs_ovms.html). It is normally used in combination with the [OVMS predictor workflow step](ovms-predictor.md) in FuseML workflows to serve input ML models with the OpenVINO Model Server. The OVMS converter workflow extension is implemented using the [OpenVINO Model Optimizer](https://docs.openvino.ai/latest/openvino_docs_MO_DG_Deep_Learning_Model_Optimizer_DevGuide.html).

The OVMS converter step expects a model URL to be supplied as input, pointing to the location in a remote model store where the model is stored. The protocols currently supported for the remote artifact store are: 

- AWS S3 or S3 compatible
- GCS
- plain HTTP/HTTPs remote location

The model formats of the input models that the OVMS converter is able to convert into IR format are:

- TensorFlow (saved_model) models
- ONNX models

The converter performs the following tasks:

- downloads the model locally from the remote artifact store.
- if the model is stored in an MLflow remote store and if so instructed, it auto-detects the format of the input model based on the information stored in the MLflow artifact store.
- it converts/optimizes the model using the provided OpenVINO Model Optimizer tools.
- it uploads the converted model to the output remote artifact store.

## Using the OVMS Converter Step

TBD

