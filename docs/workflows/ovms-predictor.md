# OpenVINO Model Server predictor extension for FuseML workflows

## Overview

The OVMS predictor workflow step can be used to create and manage [OpenVINO Model Server inference servers](https://docs.openvino.ai/latest/openvino_docs_ovms.html) to serve input ML models as part of the execution of FuseML workflows. The OVMS predictor only accepts models in IR (Intermediate Representation) format as input. The [OVMS converter](ovms-converter.md) workflow extension can be used to convert models to IR format.

The KServe predictor step expects a model URL to be supplied as input, pointing to the location in a remote model store where the model is stored. The protocols supported for the remote artifact store are the same as [those supported by the OVMS implementation](https://github.com/openvinotoolkit/model_server/tree/v2021.3/deploy#model-repository): 

- AWS S3 or S3 compatible
- GCS
- Azure Blob Storage

The predictor performs the following tasks:

- it creates an OVMS prediction service instance to serve the model, and an Istio virtualservice that exposes the prediction service
- it registers the OVMS prediction service with FuseML as an Application object. Information about the Application, such as the type and exposed inference URL can be retrieved at any time using the FuseML API and CLI.

## Using the OVMS Predictor Step

TBD

