#changed:
# in input_data dictionary, new input is location.

import tool_list
import os
from dotenv import load_dotenv
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_cohere.react_multi_hop.agent import create_cohere_react_agent

#for vector db
import numpy as np
import pdfplumber
import pytesseract
from PIL import Image
from sentence_transformers import SentenceTransformer
from pymilvus import connections, utility, Collection, CollectionSchema, FieldSchema, DataType

load_dotenv()
COHERE_API_KEY = os.getenv('COHERE_API_KEY')
os.environ["LANGCHAIN_API_KEY"] = os.getenv('LANGCHAIN_API_KEY')
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "FoodAI_tracing"
LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com"

tools_list = tool_list.TOOLS

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "{preamble}",),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)

# prompt = ChatPromptTemplate.from_template("{input}")

llm = ChatCohere(model="command-r-plus")
agent = create_cohere_react_agent(llm, tools_list, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools_list, verbose=True)

# input_data = {           #old
#     'datetime':'',
#     'input':'',
#     'image':'',
# }

input_data = {              #new
    'image':'',
    'location':'',
}

with open('AgentImg_prompt.txt', 'r') as file:
    preamble = file.read()

import datetime
def ai_ImgAnalyser(user_input):
    global input_data
    weather_api_res = tool_list.get_current_weather(user_input.location)
    input_data = {
        'datetime':str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        'image':user_input.image,
        'location':user_input.location,
        'temperature':f"{weather_api_res['main']['temp']}°C",
        'humidity':f"{weather_api_res['main']['humidity']}%"
    }
    response = agent_executor.invoke({"input": input_data, "preamble": preamble})['output']
    return response

with open('AgentChat_prompt.txt', 'r') as file:
    preambleC = file.read()

def ai_InventoryManeger(user_input):
    global input_data
    input_data = {
        'datetime':str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        'input':user_input.input,
        'location': user_input.location,
    }
    response = agent_executor.invoke({"input": input_data, "preamble": preambleC})['output']
    return response


with open('vision_prompt.txt', 'r') as file:
    preambleV = file.read()

def direct_image(user_input):
    image_url = user_input.image
    loc = user_input.location
    return tool_list.visual_tool.invoke({"prompt":preambleV, "image_url":image_url, "loc":loc})

def connect_milvus():
    #Connect to Milvus
    connections.connect(alias="default", host="127.0.0.1", port="19530")
    print("Connected to Milvus!")

    collection_name = "pdf_embeddings"
    if not utility.has_collection(collection_name):
        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),
        ]
        schema = CollectionSchema(fields, description="Stores PDF embeddings")
        collection = Collection(name=collection_name, schema=schema)
        collection.create_index(
            field_name="embedding",
            index_params={"index_type": "IVF_FLAT", "metric_type": "COSINE", "params": {"nlist": 128}},
        )
        print(f"Collection '{collection_name}' created successfully!")
    else:
        print(f"Collection '{collection_name}' already exists.")

    yield  # This point allows the application to handle requests

    # Shutdown: Disconnect from Milvus
    connections.disconnect(alias="default")
    print("Disconnected from Milvus.")


def pdf_to_knowledgebase(user_input):
    pdf_path = user_input.path

    def extract_text_images_tables(pdf_path):
        extracted_data = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extract text
                text = page.extract_text()
                if text:
                    extracted_data.append(text)

                # Extract images & OCR them
                for img in page.images:
                    img_obj = Image.open(img["stream"])
                    text_from_img = pytesseract.image_to_string(img_obj)
                    extracted_data.append(text_from_img)

                # Extract tables
                tables = page.extract_tables()
                for table in tables:
                    table_text = "\n".join(["\t".join(row) for row in table])
                    extracted_data.append(table_text)
                    
        return extracted_data

    # Extracted data
    text_chunks = extract_text_images_tables(pdf_path)
    print(text_chunks)

    # Load pre-trained embedding model
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")

    def store_embeddings_in_milvus(text_chunks):
        vectors = embed_model.encode(text_chunks, convert_to_numpy=True).tolist()
        collection = Collection("pdf_knowledge_base")  # Load collection

        # Prepare data for insertion
        entities = [
            text_chunks,  # Text data
            vectors       # Corresponding embeddings
        ]
        
        # Insert data into Milvus
        collection.insert(entities)
        collection.load()
        print(f"Inserted {len(text_chunks)} entries into Milvus.")

    # Store embeddings
    store_embeddings_in_milvus(text_chunks)
